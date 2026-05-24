import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxLength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please fill a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    // Step 1: Basic Info
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    dob: {
      type: Date,
    },
    zodiac: {
      type: String,
      trim: true,
    },
    occupation: {
      type: String,
      trim: true,
    },
    isStudent: {
      type: String,
      enum: ['Yes', 'No'],
    },
    college: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
    },
    height: {
      type: String,
      trim: true,
    },
    weight: {
      type: String,
      trim: true,
    },
    heightUnit: {
      type: String,
      enum: ['ft', 'cm'],
      default: 'ft',
    },
    weightUnit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg',
    },
    // Step 2: Interests & Relationship Prefs
    music: {
      type: String,
      trim: true,
    },
    movies: {
      type: String,
      trim: true,
    },
    date: {
      type: String,
      trim: true,
    },
    food: {
      type: String,
      trim: true,
    },
    relationshipType: {
      type: String,
      enum: ['Long-term', 'Short-term', 'Friendship', 'Still exploring'],
    },
    // Step 3: Photos & Bio
    photos: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    // OTP fields for Forgot Password
    otp: {
      type: String,
      default: null,
      select: false,
    },
    otpExpires: {
      type: Date,
      default: null,
      select: false,
    },
    otpVerified: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for age
userSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Encrypt password before saving and determine profile completion status
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Calculate isProfileComplete automatically
  const requiredFields = [
    'gender', 'dob', 'zodiac', 'occupation', 'isStudent',
    'location', 'height', 'weight', 'music', 'movies',
    'date', 'food', 'relationshipType'
  ];
  
  const hasRequiredFields = requiredFields.every(field => this[field] !== undefined && this[field] !== null && this[field] !== '');
  const hasMinPhotos = this.photos && this.photos.length >= 3;

  if (hasRequiredFields && hasMinPhotos) {
    this.isProfileComplete = true;
  } else {
    this.isProfileComplete = false;
  }

  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
