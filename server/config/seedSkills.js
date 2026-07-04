const mongoose = require('mongoose');
require('dotenv').config({ path: path = require('path').join(__dirname, '../.env') });
const Skill = require('../models/Skill');
const logger = require('./logger');

const initialSkills = [
  // Technology
  { name: 'Web Development', category: 'Technology', description: 'HTML, CSS, JavaScript, React, Node.js, and general web programming.' },
  { name: 'Python Programming', category: 'Technology', description: 'Core Python, scripting, automation, and libraries.' },
  { name: 'Data Science', category: 'Technology', description: 'Data analysis, statistics, pandas, and machine learning fundamentals.' },
  { name: 'Mobile App Development', category: 'Technology', description: 'Building iOS and Android applications using React Native or Flutter.' },
  { name: 'UI/UX Design', category: 'Technology', description: 'User interface and experience design using Figma, wireframing, and user research.' },
  { name: 'Cybersecurity', category: 'Technology', description: 'Ethical hacking, network security, and cryptography basics.' },
  
  // Languages
  { name: 'Spanish', category: 'Languages', description: 'Conversational Spanish, grammar, vocabulary, and cultural immersion.' },
  { name: 'French', category: 'Languages', description: 'French pronunciation, conversational skills, and elementary grammar.' },
  { name: 'Japanese', category: 'Languages', description: 'Hiragana, Katakana, basic Kanji, and conversational Japanese.' },
  { name: 'German', category: 'Languages', description: 'German vocabulary, phrasing, and intermediate-level conversation.' },
  { name: 'English', category: 'Languages', description: 'English as a second language (ESL), academic writing, and public speaking.' },

  // Creative & Arts
  { name: 'Photography', category: 'Creative & Arts', description: 'Manual camera settings, composition, lighting, and Adobe Lightroom editing.' },
  { name: 'Graphic Design', category: 'Creative & Arts', description: 'Vector illustration, branding, typography, and Adobe Illustrator/Photoshop.' },
  { name: 'Guitar', category: 'Creative & Arts', description: 'Acoustic/electric guitar chords, scales, fingerpicking, and music theory.' },
  { name: 'Piano', category: 'Creative & Arts', description: 'Reading sheet music, scales, chords, and keyboard techniques.' },
  { name: 'Creative Writing', category: 'Creative & Arts', description: 'Character development, plotting, world-building, and editing stories.' },

  // Lifestyle & Cooking
  { name: 'Vegan Cooking', category: 'Lifestyle & Cooking', description: 'Plant-based meal prep, flavor balancing, and dairy/meat substitutes.' },
  { name: 'Baking', category: 'Lifestyle & Cooking', description: 'Pastries, cakes, cookies, and fundamentals of baking science.' },
  { name: 'Yoga', category: 'Lifestyle & Cooking', description: 'Vinyasa flow, breathwork (Pranayama), and mindfulness meditation.' },
  { name: 'Gardening', category: 'Lifestyle & Cooking', description: 'Urban gardening, soil health, vegetable growing, and plant care.' },
  { name: 'Personal Finance', category: 'Lifestyle & Cooking', description: 'Budgeting, saving, investing basics, and tax planning.' },

  // Academics
  { name: 'Calculus', category: 'Academics', description: 'Limits, derivatives, integrals, and their applications.' },
  { name: 'Physics', category: 'Academics', description: 'Classical mechanics, thermodynamics, and electricity & magnetism.' },
  { name: 'Statistics', category: 'Academics', description: 'Probability, hypothesis testing, regression, and data visualization.' }
];

const seedSkills = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillswap';
    await mongoose.connect(mongoUri);
    logger.info('Connected to database for skill seeding.');

    // Clear existing skills
    await Skill.deleteMany({});
    logger.info('Cleared existing skills.');

    // Insert seeds
    await Skill.insertMany(initialSkills);
    logger.info(`Successfully seeded ${initialSkills.length} skills!`);

    await mongoose.disconnect();
    logger.info('Disconnected from database.');
    process.exit(0);
  } catch (error) {
    logger.error(`Error seeding skills: ${error.message}`);
    process.exit(1);
  }
};

seedSkills();
