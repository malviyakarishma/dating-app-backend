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
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate swipes between the same pair
swipeSchema.index({ liker: 1, liked: 1 }, { unique: true });

const Swipe = mongoose.model('Swipe', swipeSchema);
export default Swipe;
