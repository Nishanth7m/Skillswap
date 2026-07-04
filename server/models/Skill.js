const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Skill name is required'],
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Skill category is required'],
    trim: true,
    index: true,
  },
  description: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Text index for full-text search across name and description
skillSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Skill', skillSchema);
