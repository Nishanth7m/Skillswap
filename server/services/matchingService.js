const User = require('../models/User');

// Helper to convert HH:MM string to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if two time slots overlap
const isOverlapping = (slot1, slot2) => {
  if (slot1.day !== slot2.day) return false;

  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);

  // Overlap condition: max(start1, start2) < min(end1, end2)
  return Math.max(start1, start2) < Math.min(end1, end2);
};

// Calculate availability overlap count (capped at 5)
const calculateAvailabilityOverlap = (userASlots, userBSlots) => {
  let overlapCount = 0;
  if (!userASlots || !userBSlots) return 0;

  for (const slotA of userASlots) {
    for (const slotB of userBSlots) {
      if (isOverlapping(slotA, slotB)) {
        overlapCount++;
      }
    }
  }
  return Math.min(overlapCount, 5);
};

// Calculate match score and return details
const scoreMatch = (userA, userB) => {
  const WEIGHT_SKILL = 3.0;
  const WEIGHT_RATING = 2.0;
  const WEIGHT_AVAIL = 1.0;
  const BOOST_MUTUAL = 10.0;
  const BOOST_MOTIVATION = 2.0;

  // 1. Skill Match Score (S_skill)
  // B teaches what A wants to learn
  let skillPoints = 0;
  const aLearnIds = userA.skillsToLearn.map(item => item.skill._id || item.skill);
  
  userB.skillsToTeach.forEach(bTeach => {
    const bTeachId = bTeach.skill._id || bTeach.skill;
    if (aLearnIds.some(id => id.toString() === bTeachId.toString())) {
      let profLevel = 1; // Beginner
      if (bTeach.proficiency === 'Intermediate') profLevel = 2;
      if (bTeach.proficiency === 'Expert') profLevel = 3;
      skillPoints += profLevel;
    }
  });
  const skillScore = skillPoints * WEIGHT_SKILL;

  // 2. Rating Score (S_rating)
  // Default to 4.0 if no reviews yet
  const rating = userB.reviewCount > 0 ? userB.averageRating : 4.0;
  const ratingScore = rating * WEIGHT_RATING;

  // 3. Availability Score (S_avail)
  const overlapSlots = calculateAvailabilityOverlap(
    userA.availability?.slots || [],
    userB.availability?.slots || []
  );
  const availabilityScore = overlapSlots * WEIGHT_AVAIL;

  // 4. Mutual Match Boost (S_mutual)
  // B wants to learn what A teaches
  let isMutual = false;
  const aTeachIds = userA.skillsToTeach.map(item => item.skill._id || item.skill);
  
  for (const bLearn of userB.skillsToLearn) {
    const bLearnId = bLearn.skill._id || bLearn.skill;
    if (aTeachIds.some(id => id.toString() === bLearnId.toString())) {
      isMutual = true;
      break;
    }
  }
  const mutualMatchBoost = isMutual ? BOOST_MUTUAL : 0.0;

  // 5. Motivation Boost (S_motivation)
  // If B has low credit balance (<= 2), B is highly motivated to teach
  let motivationBoost = 0.0;
  if (userB.creditBalance <= 2) {
    motivationBoost = BOOST_MOTIVATION;
  } else if (userB.creditBalance < 10) {
    motivationBoost = 1.0; // Moderate motivation
  }

  const totalScore = parseFloat(
    (skillScore + ratingScore + availabilityScore + mutualMatchBoost + motivationBoost).toFixed(2)
  );

  return {
    score: totalScore,
    breakdown: {
      skillScore,
      ratingScore,
      availabilityScore,
      mutualMatchBoost,
      motivationBoost,
    },
  };
};

const getSuggestions = async (currentUser) => {
  const targetSkillIds = currentUser.skillsToLearn.map(item => item.skill);

  // If user has not added any skills to learn yet, return empty list or general suggestion
  if (targetSkillIds.length === 0) {
    return [];
  }

  // Find other users who can teach at least one skill currentUser wants to learn
  const potentialMatches = await User.find({
    _id: { $ne: currentUser._id },
    'skillsToTeach.skill': { $in: targetSkillIds },
  })
    .populate('skillsToTeach.skill')
    .populate('skillsToLearn.skill');

  const suggestions = potentialMatches.map(potential => {
    const scoringResult = scoreMatch(currentUser, potential);
    return {
      user: {
        _id: potential._id,
        name: potential.name,
        avatar: potential.avatar,
        bio: potential.bio,
        skillsToTeach: potential.skillsToTeach,
        skillsToLearn: potential.skillsToLearn,
        availability: potential.availability,
        averageRating: potential.averageRating,
        reviewCount: potential.reviewCount,
        creditBalance: potential.creditBalance,
      },
      score: scoringResult.score,
      breakdown: scoringResult.breakdown,
    };
  });

  // Sort by highest score first
  return suggestions.sort((a, b) => b.score - a.score);
};

module.exports = {
  scoreMatch,
  getSuggestions,
};
