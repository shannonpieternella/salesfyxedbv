const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['owner', 'leader', 'agent'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  password_hash: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  sponsorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  stripeCustomerId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

userSchema.index({ email: 1 });
userSchema.index({ sponsorId: 1 });
userSchema.index({ role: 1, active: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password_hash;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);