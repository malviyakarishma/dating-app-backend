import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Swipe from './models/Swipe.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dating-app';

const seedMatches = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected for seeding matches...');

    // Find the target user
    const yogUser = await User.findOne({ email: 'yog@yopmail.com' });
    if (!yogUser) {
      console.error('❌ User yog@yopmail.com not found! Please register or seed this user first.');
      process.exit(1);
    }
    console.log(`✅ Found target user: ${yogUser.name} (${yogUser._id})`);

    // Find seed users to create swipes FROM
    const seedEmails = [
      'sarah@gmail.com',
      'aisha@gmail.com',
      'sophia@gmail.com',
      'chloe@gmail.com',
      'mia@gmail.com',
      'lily@gmail.com',
    ];

    const seedUsers = await User.find({ email: { $in: seedEmails } });
    console.log(`Found ${seedUsers.length} seed users to create matches from.`);

    if (seedUsers.length === 0) {
      console.error('❌ No seed users found! Run seedUsers.js first.');
      process.exit(1);
    }

    // Clear any existing swipes between these users and yog
    const seedUserIds = seedUsers.map(u => u._id);
    const deleted = await Swipe.deleteMany({
      $or: [
        { liker: { $in: seedUserIds }, liked: yogUser._id },
        { liker: yogUser._id, liked: { $in: seedUserIds } },
      ]
    });
    console.log(`Cleared ${deleted.deletedCount} existing swipes.`);

    // --- Create incoming requests (other users swiped right on yog, pending) ---
    // These will show as "requests" in the Matches screen
    const requestUsers = seedUsers.slice(0, 4); // First 4 users as incoming requests
    for (const user of requestUsers) {
      const swipe = new Swipe({
        liker: user._id,
        liked: yogUser._id,
        status: 'like',
        matchStatus: 'pending',
      });
      await swipe.save();
      console.log(`💌 Created incoming request: ${user.name} → yog (pending)`);
    }

    // --- Create mutual matches (both swiped right, accepted) ---
    // These will show as "matches" in the Matches screen with chat unlocked
    const matchUsers = seedUsers.slice(4); // Remaining users as mutual matches
    for (const user of matchUsers) {
      // The other user swiped right on yog (accepted)
      const swipe1 = new Swipe({
        liker: user._id,
        liked: yogUser._id,
        status: 'like',
        matchStatus: 'accepted',
      });
      await swipe1.save();

      // Yog also swiped right on them (accepted)
      const swipe2 = new Swipe({
        liker: yogUser._id,
        liked: user._id,
        status: 'like',
        matchStatus: 'accepted',
      });
      await swipe2.save();

      console.log(`💕 Created mutual match: ${user.name} ↔ yog (accepted)`);
    }

    console.log('\n🚀 Successfully seeded matches!');
    console.log(`   📩 ${requestUsers.length} incoming requests (pending)`);
    console.log(`   💕 ${matchUsers.length} mutual matches (chat unlocked)`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding matches failed:', error);
    process.exit(1);
  }
};

seedMatches();
