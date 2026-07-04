const Session = require('../models/Session');
const Match = require('../models/Match');
const User = require('../models/User');
const Skill = require('../models/Skill');
const CreditTransaction = require('../models/CreditTransaction');
const ledgerService = require('../services/ledgerService');
const { sendNotification } = require('../services/socketService');
const logger = require('../config/logger');

// @desc    Propose a new teaching session
// @route   POST /api/sessions/propose
// @access  Private
const proposeSession = async (req, res, next) => {
  const { matchId, skillId, proposedTime } = req.body;

  try {
    if (!matchId || !skillId || !proposedTime) {
      return res.status(400).json({
        success: false,
        message: 'Match ID, Skill ID, and Proposed Time are required',
      });
    }

    const match = await Match.findById(matchId);
    if (!match || match.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot propose a session for an inactive or pending match',
      });
    }

    // Determine who is the teacher and who is the learner
    // Look up both users to see who teaches the skill
    const requester = await User.findById(match.requester);
    const recipient = await User.findById(match.recipient);

    let teacherId, learnerId;

    const requesterTeaches = requester.skillsToTeach.some(
      (s) => s.skill.toString() === skillId.toString()
    );
    const recipientTeaches = recipient.skillsToTeach.some(
      (s) => s.skill.toString() === skillId.toString()
    );

    if (requesterTeaches) {
      teacherId = requester._id;
      learnerId = recipient._id;
    } else if (recipientTeaches) {
      teacherId = recipient._id;
      learnerId = requester._id;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Neither user in this match has listed this skill under their teachable skills',
      });
    }

    // Check if proposer is part of the match
    const isProposerRequester = req.user._id.toString() === requester._id.toString();
    const isProposerRecipient = req.user._id.toString() === recipient._id.toString();
    if (!isProposerRequester && !isProposerRecipient) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this match',
      });
    }

    const newSession = await Session.create({
      match: matchId,
      teacher: teacherId,
      learner: learnerId,
      skill: skillId,
      proposedTime,
      status: 'PENDING',
    });

    logger.info(`Session proposed by user ${req.user.email} for match: ${matchId}`);

    // Notify the other participant
    const proposalRecipientId = req.user._id.toString() === teacherId.toString() ? learnerId : teacherId;
    sendNotification(proposalRecipientId, 'SESSION_PROPOSAL', {
      sessionId: newSession._id,
      proposerName: req.user.name,
      proposerId: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: newSession,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept a proposed session (confirms and reserves credits)
// @route   PUT /api/sessions/:id/accept
// @access  Private
const acceptSession = async (req, res, next) => {
  try {
    const sessionDoc = await Session.findById(req.params.id);

    if (!sessionDoc) {
      return res.status(404).json({
        success: false,
        message: 'Session proposal not found',
      });
    }

    if (sessionDoc.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Session is already ${sessionDoc.status.toLowerCase()}`,
      });
    }

    // Proposer is the one who created it. The OTHER party must accept.
    // We don't track proposer directly, but we can verify that the acceptor is either
    // the teacher or learner, and they are accepting an offer where they are the recipient.
    // For simplicity, let's verify the logged in user is part of the session
    const isTeacher = req.user._id.toString() === sessionDoc.teacher.toString();
    const isLearner = req.user._id.toString() === sessionDoc.learner.toString();

    if (!isTeacher && !isLearner) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this session',
      });
    }

    // Confirm and reserve credits using ledger service
    const confirmedSession = await ledgerService.confirmAndReserve(
      sessionDoc._id,
      sessionDoc.learner,
      sessionDoc.teacher
    );

    // Notify the other participant
    const otherUserId = req.user._id.toString() === confirmedSession.teacher.toString() ? confirmedSession.learner : confirmedSession.teacher;
    sendNotification(otherUserId, 'SESSION_ACCEPTED', {
      sessionId: confirmedSession._id,
      acceptorName: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: confirmedSession,
    });
  } catch (error) {
    // Pass to centralized error handler (e.g. for "Insufficient credit balance")
    next(error);
  }
};

// @desc    Decline a proposed session
// @route   PUT /api/sessions/:id/decline
// @access  Private
const declineSession = async (req, res, next) => {
  try {
    const sessionDoc = await Session.findById(req.params.id);

    if (!sessionDoc) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (sessionDoc.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending session proposals can be declined',
      });
    }

    const isTeacher = req.user._id.toString() === sessionDoc.teacher.toString();
    const isLearner = req.user._id.toString() === sessionDoc.learner.toString();

    if (!isTeacher && !isLearner) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this session',
      });
    }

    sessionDoc.status = 'CANCELLED';
    await sessionDoc.save();

    logger.info(`Session proposal ${sessionDoc._id} declined by user: ${req.user.email}`);

    // Notify the other participant
    const otherUserId = req.user._id.toString() === sessionDoc.teacher.toString() ? sessionDoc.learner : sessionDoc.teacher;
    sendNotification(otherUserId, 'SESSION_DECLINED', {
      sessionId: sessionDoc._id,
      declinerName: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: sessionDoc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a session (and refund if confirmed)
// @route   PUT /api/sessions/:id/cancel
// @access  Private
const cancelSession = async (req, res, next) => {
  try {
    const sessionDoc = await Session.findById(req.params.id);

    if (!sessionDoc) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const isTeacher = req.user._id.toString() === sessionDoc.teacher.toString();
    const isLearner = req.user._id.toString() === sessionDoc.learner.toString();

    if (!isTeacher && !isLearner) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this session',
      });
    }

    if (sessionDoc.status === 'CANCELLED' || sessionDoc.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a session that is already ${sessionDoc.status.toLowerCase()}`,
      });
    }

    let updatedSession;

    if (sessionDoc.status === 'CONFIRMED') {
      // Refund credits since they were reserved
      updatedSession = await ledgerService.cancelAndRefund(sessionDoc._id, sessionDoc.learner);
    } else {
      // Session was pending, just cancel it
      sessionDoc.status = 'CANCELLED';
      updatedSession = await sessionDoc.save();
    }

    // Notify the other participant
    const otherUserId = req.user._id.toString() === updatedSession.teacher.toString() ? updatedSession.learner : updatedSession.teacher;
    sendNotification(otherUserId, 'SESSION_CANCELLED', {
      sessionId: updatedSession._id,
      cancellerName: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete a session (transfers credits)
// @route   PUT /api/sessions/:id/complete
// @access  Private
const completeSession = async (req, res, next) => {
  try {
    const sessionDoc = await Session.findById(req.params.id);

    if (!sessionDoc) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const isTeacher = req.user._id.toString() === sessionDoc.teacher.toString();
    const isLearner = req.user._id.toString() === sessionDoc.learner.toString();

    if (!isTeacher && !isLearner) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this session',
      });
    }

    if (sessionDoc.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed sessions can be marked completed',
      });
    }

    // Complete session and transfer credits using ledger service
    const completedSession = await ledgerService.completeAndTransfer(
      sessionDoc._id,
      sessionDoc.learner,
      sessionDoc.teacher
    );

    // Notify the other participant
    const otherUserId = req.user._id.toString() === completedSession.teacher.toString() ? completedSession.learner : completedSession.teacher;
    sendNotification(otherUserId, 'SESSION_COMPLETED', {
      sessionId: completedSession._id,
      completionName: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: completedSession,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sessions for current user
// @route   GET /api/sessions
// @access  Private
const getUserSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({
      $or: [
        { teacher: req.user._id },
        { learner: req.user._id }
      ]
    })
      .populate('teacher', 'name avatar bio averageRating')
      .populate('learner', 'name avatar bio averageRating')
      .populate('skill', 'name category')
      .sort({ 'proposedTime.date': -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user credit transaction ledger history
// @route   GET /api/sessions/transactions
// @access  Private
const getTransactionHistory = async (req, res, next) => {
  try {
    const transactions = await CreditTransaction.find({
      $or: [
        { fromUser: req.user._id },
        { toUser: req.user._id }
      ]
    })
      .populate('fromUser', 'name avatar')
      .populate('toUser', 'name avatar')
      .populate({
        path: 'session',
        populate: { path: 'skill', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  proposeSession,
  acceptSession,
  declineSession,
  cancelSession,
  completeSession,
  getUserSessions,
  getTransactionHistory,
};
