const Message = require('../models/Message');
const Match = require('../models/Match');

// @desc    Get chat history for a match
// @route   GET /api/chat/:matchId
// @access  Private
const getChatHistory = async (req, res, next) => {
  const { matchId } = req.params;

  try {
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Verify the user is part of the match
    const isParticipant =
      match.requester.toString() === req.user._id.toString() ||
      match.recipient.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this chat history',
      });
    }

    const messages = await Message.find({ match: matchId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 }); // Oldest first

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatHistory,
};
