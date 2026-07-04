const express = require('express');
const { getSkills, createSkill, getSkillTeachers } = require('../controllers/skillController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(getSkills)
  .post(protect, createSkill);

router.get('/:skillId/teachers', protect, getSkillTeachers);


module.exports = router;
