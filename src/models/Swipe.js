import mongoose from 'mongoose';

const swipeSchema = new mongoose.Schema(
  {
    liker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    liked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
    // Only relevant when status === 'like'
    // pending  → request sent, waiting for recipient to respond
    // accepted → recipient accepted → both are matched
    // declined → recipient declined → request removed
    matchStatus: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate swipes between the same pair
swipeSchema.index({ liker: 1, liked: 1 }, { unique: true });

const Swipe = mongoose.model('Swipe', swipeSchema);
export default Swipe;
