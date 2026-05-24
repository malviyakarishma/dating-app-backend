import mongoose from 'mongoose';

const passwordHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only need creation time
  }
);

// Index to quickly query latest passwords for a user
passwordHistorySchema.index({ user: 1, createdAt: -1 });

const PasswordHistory = mongoose.model('PasswordHistory', passwordHistorySchema);
export default PasswordHistory;
