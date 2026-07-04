const express = require('express');
const { createReview, getUserReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createReview);
router.get('/user/:userId', protect, getUserReviews);

module.exports = router;
