const { Server } = require('socket.io');
const { verifyAccessToken } = require('../config/jwt');
const Message = require('../models/Message');
const Match = require('../models/Match');
const logger = require('../config/logger');

// Store active user connections: userId -> socketId
const userSockets = new Map();

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Socket authentication middleware using JWT
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      logger.warn(`Socket auth failed: ${error.message}`);
      return next(new Error('Authentication error: Token invalid'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    userSockets.set(userId, socket.id);
    logger.debug(`User connected to socket: ${userId} (Socket: ${socket.id})`);

    // 1. Join chat room for a match
    socket.on('joinMatchRoom', async ({ matchId }) => {
      try {
        // Verify user is part of the match before letting them join
        const match = await Match.findById(matchId);
        if (!match) {
          socket.emit('error', { message: 'Match not found' });
          return;
        }

        const isParticipant =
          match.requester.toString() === userId.toString() ||
          match.recipient.toString() === userId.toString();

        if (!isParticipant) {
          socket.emit('error', { message: 'Unauthorized access to this chat room' });
          return;
        }

        const roomName = `match_${matchId}`;
        socket.join(roomName);
        logger.debug(`User ${userId} joined room ${roomName}`);
      } catch (err) {
        logger.error(`Error joining socket room: ${err.message}`);
      }
    });

    // 2. Handle sending chat message
    socket.on('sendMessage', async ({ matchId, content }) => {
      try {
        if (!content || !content.trim()) return;

        // Save to DB
        const savedMessage = await Message.create({
          match: matchId,
          sender: userId,
          content: content.trim(),
        });

        const populatedMessage = await Message.findById(savedMessage._id)
          .populate('sender', 'name avatar');

        const roomName = `match_${matchId}`;
        
        // Broadcast message to everyone in the room
        io.to(roomName).emit('messageReceived', populatedMessage);

        // Send a notification alert to the recipient if they aren't currently in the room
        const match = await Match.findById(matchId);
        const recipientId = match.requester.toString() === userId.toString()
          ? match.recipient.toString()
          : match.requester.toString();

        // Check if recipient is active and not in the room.
        // We emit a general chat notification to their private socket if connected
        sendNotification(recipientId, 'NEW_MESSAGE', {
          matchId,
          senderName: populatedMessage.sender.name,
          content: content.substring(0, 50),
        });

      } catch (err) {
        logger.error(`Error sending message via socket: ${err.message}`);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // 3. User disconnect
    socket.on('disconnect', () => {
      userSockets.delete(userId);
      logger.debug(`User disconnected: ${userId} (Socket: ${socket.id})`);
    });
  });

  return io;
};

/**
 * Send real-time notification alert to a specific user
 * @param {string} userId - Target user ID
 * @param {string} type - Notification type (e.g. 'NEW_MATCH_REQUEST', 'SESSION_PROPOSAL', 'NEW_MESSAGE')
 * @param {object} data - Payload data
 */
const sendNotification = (userId, type, data) => {
  if (!io) return;

  const targetSocketId = userSockets.get(userId.toString());
  if (targetSocketId) {
    io.to(targetSocketId).emit('notification', {
      type,
      data,
      createdAt: new Date(),
    });
    logger.debug(`Socket notification sent to user ${userId} of type ${type}`);
  } else {
    logger.debug(`Socket notification omitted: User ${userId} is offline`);
  }
};

module.exports = {
  initSocket,
  sendNotification,
};
