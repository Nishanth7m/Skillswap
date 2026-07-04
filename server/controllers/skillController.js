const Skill = require('../models/Skill');

// @desc    Get all skills with optional search and category filters
// @route   GET /api/skills
// @access  Public
const getSkills = async (req, res, next) => {
  try {
    const { q, category } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (q) {
      query.$text = { $search: q };
    }

    let queryBuilder = Skill.find(query);

    // If text searching, sort by text relevance score
    if (q) {
      queryBuilder = queryBuilder
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
    } else {
      queryBuilder = queryBuilder.sort({ name: 1 });
    }

    const skills = await queryBuilder;
    
    // Get unique categories list for filter dropdowns on client
    const categories = await Skill.distinct('category');

    res.status(200).json({
      success: true,
      count: skills.length,
      categories,
      data: skills,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new skill
// @route   POST /api/skills
// @access  Private
const createSkill = async (req, res, next) => {
  const { name, category, description } = req.body;

  try {
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both name and category',
      });
    }

    const existingSkill = await Skill.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingSkill) {
      return res.status(400).json({
        success: false,
        message: 'A skill with this name already exists',
      });
    }

    const skill = await Skill.create({
      name,
      category,
      description,
    });

    res.status(201).json({
      success: true,
      data: skill,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users who can teach a specific skill
// @route   GET /api/skills/:skillId/teachers
// @access  Private
const getSkillTeachers = async (req, res, next) => {
  try {
    const { skillId } = req.params;

    // Find other users who teach this skill
    const teachers = await User.find({
      _id: { $ne: req.user._id },
      'skillsToTeach.skill': skillId
    }).select('name avatar bio averageRating reviewCount creditBalance availability');

    res.status(200).json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSkills,
  createSkill,
  getSkillTeachers,
};

