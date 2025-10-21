const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const searchHistorySchema = new mongoose.Schema({
  query: String,
  resultCount: Number,
  resultsIds: [mongoose.Schema.Types.ObjectId],
  timestamp: { type: Date, default: Date.now }
});

const viewHistorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  category: String,
  timestamp: { type: Date, default: Date.now }
});

const purchaseHistorySchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  productName: String,
  category: String,
  quantity: Number,
  price: Number,
  timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['customer', 'farmer', 'admin'],
    default: 'customer'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  
  // Fields for AI recommendation system
  searchHistory: [searchHistorySchema],
  viewHistory: [viewHistorySchema],
  purchaseHistory: [purchaseHistorySchema],
  preferences: {
    categories: [String],
    priceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 1000 }
    },
    organicPreference: { type: Boolean, default: true }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// ✅ CRITICAL: Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  try {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
      return next();
    }

    console.log('🔐 Hashing password for user:', this.email);
    
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    console.log('✅ Password hashed successfully');
    next();
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    next(error);
  }
});

// ✅ CRITICAL: Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🔍 Comparing password for user:', this.email);
    
    if (!candidatePassword) {
      console.log('❌ No candidate password provided');
      return false;
    }
    
    if (!this.password) {
      console.log('❌ No stored password found');
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔐 Password comparison result:', isMatch ? '✅ Match' : '❌ No match');
    
    return isMatch;
  } catch (error) {
    console.error('❌ Error comparing password:', error);
    return false;
  }
};

// ✅ Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// ✅ Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// ✅ Transform method to remove password from JSON responses
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
