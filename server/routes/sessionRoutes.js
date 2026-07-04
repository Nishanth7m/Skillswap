const express = require('express');
const {
  proposeSession,
  acceptSession,
  declineSession,
  cancelSession,
  completeSession,
  getUserSessions,
  getTransactionHistory,
} = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');
const { sessionLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/', protect, getUserSessions);
router.get('/transactions', protect, getTransactionHistory);
router.post('/propose', protect, sessionLimiter, proposeSession);
router.put('/:id/accept', protect, acceptSession);
router.put('/:id/decline', protect, declineSession);
router.put('/:id/cancel', protect, cancelSession);
router.put('/:id/complete', protect, completeSession);

module.exports = router;
