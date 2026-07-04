const Match = require('../models/Match');
const User = require('../models/User');
const matchingService = require('../services/matchingService');
const { sendNotification } = require('../services/socketService');
const logger = require('../config/logger');

// @desc    Get match suggestions based on user interests
// @route   GET /api/matches/suggestions
// @access  Private
const getSuggestionsList = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id)
      .populate('skillsToTeach.skill')
      .populate('skillsToLearn.skill');

    const suggestions = await matchingService.getSuggestions(currentUser);

    // Filter out suggestions that already have a match record (PENDING or ACCEPTED)
    const existingMatches = await Match.find({
      $or: [
        { requester: req.user._id },
        { recipient: req.user._id }
      ]
    });

    const matchedUserIds = existingMatches.map(m => 
      m.requester.toString() === req.user._id.toString() 
        ? m.recipient.toString() 
        : m.requester.toString()
    );

    const filteredSuggestions = suggestions.filter(s => 
      !matchedUserIds.includes(s.user._id.toString())
    );

    res.status(200).json({
      success: true,
      count: filteredSuggestions.length,
      data: filteredSuggestions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request a match connection with another user
// @route   POST /api/matches/request
// @access  Private
const requestMatch = async (req, res, next) => {
  const { recipientId } = req.body;

  try {
    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required',
      });
    }

    if (recipientId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot match with yourself',
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found',
      });
    }

    // Check if a match request already exists
    const existingMatch = await Match.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id }
      ]
    });

    if (existingMatch) {
      return res.status(400).json({
        success: false,
        message: 'A match request already exists or you are already connected',
        status: existingMatch.status
      });
    }

    // Calculate match score to save on the Match model
    const userA = await User.findById(req.user._id);
    const userB = await User.findById(recipientId);
    const scoreResult = matchingService.scoreMatch(userA, userB);

    const newMatch = await Match.create({
      requester: req.user._id,
      recipient: recipientId,
      status: 'PENDING',
      score: scoreResult.score
    });

    logger.info(`Match requested from ${req.user.email} to ${recipient.email}`);

    // Send real-time notification to the recipient
    sendNotification(recipientId, 'NEW_MATCH_REQUEST', {
      matchId: newMatch._id,
      requesterName: req.user.name,
      requesterId: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: newMatch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept match request
// @route   PUT /api/matches/:id/accept
// @access  Private
const acceptMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Make sure the logged in user is the recipient of the match request
    if (match.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept match requests sent to you',
      });
    }

    if (match.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Match request is already ${match.status.toLowerCase()}`,
      });
    }

    match.status = 'ACCEPTED';
    await match.save();

    logger.info(`Match ID ${match._id} accepted by ${req.user.email}`);

    // Send real-time notification to the requester
    sendNotification(match.requester, 'MATCH_ACCEPTED', {
      matchId: match._id,
      recipientName: req.user.name,
      recipientId: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Decline match request
// @route   PUT /api/matches/:id/decline
// @access  Private
const declineMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Make sure the logged in user is the recipient of the match request
    if (match.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only decline match requests sent to you',
      });
    }

    if (match.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Match request is already ${match.status.toLowerCase()}`,
      });
    }

    match.status = 'DECLINED';
    await match.save();

    logger.info(`Match ID ${match._id} declined by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's active and pending matches
// @route   GET /api/matches
// @access  Private
const getMatches = async (req, res, next) => {
  try {
    const matches = await Match.find({
      $or: [
        { requester: req.user._id },
        { recipient: req.user._id }
      ]
    })
      .populate('requester', 'name avatar bio averageRating reviewCount creditBalance')
      .populate('recipient', 'name avatar bio averageRating reviewCount creditBalance')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuggestionsList,
  requestMatch,
  acceptMatch,
  declineMatch,
  getMatches,
};
