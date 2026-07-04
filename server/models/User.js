const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false,
  },
  bio: {
    type: String,
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  skillsToTeach: [{
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    proficiency: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Expert'],
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  }],
  skillsToLearn: [{
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    desiredLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Expert'],
      required: true,
    },
  }],
  availability: {
    timezone: {
      type: String,
      default: 'UTC',
    },
    slots: [{
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true,
      },
      startTime: {
        type: String,
        required: true, // HH:MM
      },
      endTime: {
        type: String,
        required: true, // HH:MM
      },
    }],
  },
  creditBalance: {
    type: Number,
    default: 5,
    min: [0, 'Credit balance cannot be negative'],
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  refreshToken: {
    type: String,
    select: false,
  },
}, {
  timestamps: true,
});

// Pre-save hook to hash password
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes
userSchema.index({ 'skillsToTeach.skill': 1 });
userSchema.index({ 'skillsToLearn.skill': 1 });

module.exports = mongoose.model('User', userSchema);
