const Review = require('../models/Review');
const Session = require('../models/Session');
const User = require('../models/User');
const logger = require('../config/logger');

// Helper to recalculate and update user rating statistics
const updateUserRatingStats = async (userId) => {
  try {
    const stats = await Review.aggregate([
      { $match: { recipient: userId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await User.findByIdAndUpdate(userId, {
        averageRating: parseFloat(stats[0].averageRating.toFixed(2)),
        reviewCount: stats[0].reviewCount,
      });
      logger.info(`Updated rating stats for user ${userId}: Avg=${stats[0].averageRating}, Count=${stats[0].reviewCount}`);
    } else {
      await User.findByIdAndUpdate(userId, {
        averageRating: 0,
        reviewCount: 0,
      });
    }
  } catch (error) {
    logger.error(`Error updating rating stats for user ${userId}: ${error.message}`);
  }
};

// @desc    Create a review for a completed session
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res, next) => {
  const { sessionId, rating, comment } = req.body;

  try {
    if (!sessionId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and rating (1-5) are required',
      });
    }

    const sessionDoc = await Session.findById(sessionId);
    if (!sessionDoc) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (sessionDoc.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted for completed sessions',
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

    // Determine the review recipient and role
    let recipientId, recipientRole;
    if (isTeacher) {
      // Teacher reviews the learner
      recipientId = sessionDoc.learner;
      recipientRole = 'LEARNER';
    } else {
      // Learner reviews the teacher
      recipientId = sessionDoc.teacher;
      recipientRole = 'TEACHER';
    }

    // Check if user has already reviewed this session
    const existingReview = await Review.findOne({
      session: sessionId,
      author: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this session',
      });
    }

    const review = await Review.create({
      session: sessionId,
      author: req.user._id,
      recipient: recipientId,
      rating,
      comment,
      role: recipientRole,
    });

    logger.info(`Review created for session ${sessionId} by author ${req.user.email}`);

    // Update user stats in background
    await updateUserRatingStats(recipientId);

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews received by a user
// @route   GET /api/reviews/user/:userId
// @access  Private
const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ recipient: req.params.userId })
      .populate('author', 'name avatar')
      .populate({
        path: 'session',
        populate: { path: 'skill', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getUserReviews,
};
