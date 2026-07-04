const express = require('express');
const { getProfile, updateProfile, getUserPublicProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

router.route('/:id')
  .get(protect, getUserPublicProfile);

module.exports = router;
