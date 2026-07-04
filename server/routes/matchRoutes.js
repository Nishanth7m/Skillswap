const express = require('express');
const {
  getSuggestionsList,
  requestMatch,
  acceptMatch,
  declineMatch,
  getMatches,
} = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/suggestions', protect, getSuggestionsList);
router.post('/request', protect, requestMatch);
router.put('/:id/accept', protect, acceptMatch);
router.put('/:id/decline', protect, declineMatch);
router.get('/', protect, getMatches);

module.exports = router;
