import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dating-app';

const mockProfiles = [
  {
    name: 'Sarah',
    email: 'sarah@gmail.com',
    password: 'password123',
    gender: 'Female',
    dob: new Date('2002-06-15'),
    zodiac: 'Gemini',
    occupation: 'Fashion Designer',
    isStudent: 'No',
    location: 'Mumbai',
    height: '5.5',
    weight: '54',
    music: 'Indie Rock & Pop',
    movies: 'Rom-coms & Classics',
    date: 'A cozy sunset picnic at the beach',
    food: 'Sushi & Italian',
    relationshipType: 'Long-term',
    bio: 'Always looking for the next inspiration. Let\'s explore local art galleries and coffee spots together.',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=500&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Aisha',
    email: 'aisha@gmail.com',
    password: 'password123',
    gender: 'Female',
    dob: new Date('2001-11-20'),
    zodiac: 'Scorpio',
    occupation: 'Architect',
    isStudent: 'No',
    location: 'Delhi',
    height: '5.6',
    weight: '56',
    music: 'Acoustic & Blues',
    movies: 'Sci-fi & Documentaries',
    date: 'Visiting a historic architectural site, followed by deep conversation',
    food: 'North Indian & Lebanese',
    relationshipType: 'Long-term',
    bio: 'Dreamer, coffee lover, and sketch artist. Let\'s talk about design, urban exploration, and indie rock.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Sophia',
    email: 'sophia@gmail.com',
    password: 'password123',
    gender: 'Female',
    dob: new Date('2003-03-10'),
    zodiac: 'Pisces',
    occupation: 'Student',
    isStudent: 'Yes',
    college: 'St. Xavier\'s',
    location: 'Mumbai',
    height: '5.4',
    weight: '50',
    music: 'Jazz & Lofi',
    movies: 'Anime & Fantasy',
    date: 'Baking a cake together from scratch',
    food: 'Pastries & Ramen',
    relationshipType: 'Friendship',
    bio: 'Baking enthusiast and vinyl collector. Catch me at a local record store or in a cozy bakery.',
    photos: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Chloe',
    email: 'chloe@gmail.com',
    password: 'password123',
    gender: 'Female',
    dob: new Date('2001-08-05'),
    zodiac: 'Leo',
    occupation: 'Marketing Director',
    isStudent: 'No',
    location: 'Bangalore',
    height: '5.7',
    weight: '58',
    music: 'EDM & Techno',
    movies: 'Thrillers & Action',
    date: 'Going to a high-energy dance club or concert',
    food: 'Burgers & Cocktails',
    relationshipType: 'Still exploring',
    bio: 'Sunset chaser and puppy lover. Seeking good vibes, deep conversations, and maybe a bit of dancing.',
    photos: [
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1548142813-c348350df52b?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Mia',
    email: 'mia@gmail.com',
    password: 'password123',
    gender: 'Female',
    dob: new Date('2002-09-30'),
    zodiac: 'Libra',
    occupation: 'Graphic Designer',
    isStudent: 'No',
    location: 'Pune',
    height: '5.3',
    weight: '52',
    music: 'Synthwave & Electro',
    movies: 'Arthouse & Indie',
    date: 'An evening walking tour of art cafes',
    food: 'Sushi & Dimsums',
    relationshipType: 'Short-term',
    bio: 'Minimalist by design, maximalist in life. Let\'s find the best sushi in town.',
    photos: [
      'https://images.unsplash.com/photo-1506919258185-6078bba55d2a?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1520512202623-51c5c53957df?w=500&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Lily',
    email: 'lily@gmail.com',
    password: 'password123',
    gender: 'Female',
    dob: new Date('2000-12-12'),
    zodiac: 'Sagittarius',
    occupation: 'Creative Writer',
    isStudent: 'No',
    location: 'Bangalore',
    height: '5.5',
    weight: '53',
    music: 'Folk & Acoustic',
    movies: 'Period Dramas & Poetry',
    date: 'Browsing an old bookstore, followed by warm hot chocolate',
    food: 'Tacos & Desserts',
    relationshipType: 'Long-term',
    bio: 'Bookworm with a passion for creative writing and cozy rainy days. Let\'s write our own happy ending.',
    photos: [
      'https://images.unsplash.com/photo-1518577915332-c2a19f149a75?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1498551172505-8ee7ad69f214?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=500&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Daniel',
    email: 'daniel@gmail.com',
    password: 'password123',
    gender: 'Male',
    dob: new Date('1999-04-18'),
    zodiac: 'Aries',
    occupation: 'Software Engineer',
    isStudent: 'No',
    location: 'Mumbai',
    height: '6.0',
    weight: '76',
    music: 'Alternative Rock',
    movies: 'Sci-Fi & Cyberpunk',
    date: 'Spicy street food hunt followed by arcade gaming',
    food: 'Burgers, Kebabs & Fries',
    relationshipType: 'Long-term',
    bio: 'Tech by day, hiking by night. Looking for someone to share outdoor adventures and spicy food with.',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'James',
    email: 'james@gmail.com',
    password: 'password123',
    gender: 'Male',
    dob: new Date('1997-07-28'),
    zodiac: 'Leo',
    occupation: 'Head Chef',
    isStudent: 'No',
    location: 'Delhi',
    height: '5.11',
    weight: '80',
    music: 'Classical & Soul',
    movies: 'Food Documentaries & Epics',
    date: 'An exclusive multi-course homemade dinner',
    food: 'Everything! Fine dining & Street food',
    relationshipType: 'Long-term',
    bio: 'Food is my love language. I will happily cook you a 3-course meal. Let\'s exchange recipes and stories.',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1489980508314-941910ded1f4?w=500&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Liam',
    email: 'liam@gmail.com',
    password: 'password123',
    gender: 'Male',
    dob: new Date('2000-01-25'),
    zodiac: 'Aquarius',
    occupation: 'Photographer',
    isStudent: 'No',
    location: 'Bangalore',
    height: '5.10',
    weight: '72',
    music: 'Lo-fi & Indie Pop',
    movies: 'Cinematographic masterpieces',
    date: 'Sunset photo walk around scenic viewpoints',
    food: 'Continental & Pizza',
    relationshipType: 'Friendship',
    bio: 'Capturing moments that tell a story. Tell me your favorite travel destination and let\'s plan a trip.',
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=500&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Ethan',
    email: 'ethan@gmail.com',
    password: 'password123',
    gender: 'Male',
    dob: new Date('1998-10-09'),
    zodiac: 'Libra',
    occupation: 'Product Manager',
    isStudent: 'No',
    location: 'Mumbai',
    height: '6.1',
    weight: '78',
    music: 'Progressive Metal & Synth',
    movies: 'Mind-bending psychological thrillers',
    date: 'Going to an energetic live music performance',
    food: 'Steaks & Salad',
    relationshipType: 'Still exploring',
    bio: 'Fitness enthusiast, amateur guitarist, and podcast listener. Always down for a quick run or a live gig.',
    photos: [
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80'
    ]
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected for Seeding...');

    // Clear existing mock data if email matches to prevent duplication
    const mockEmails = mockProfiles.map(p => p.email);
    const deleteRes = await User.deleteMany({ email: { $in: mockEmails } });
    console.log(`Cleared ${deleteRes.deletedCount} existing mock profiles.`);

    // Insert new profiles
    for (const profile of mockProfiles) {
      // Create user directly, saving triggers bcrypt and profile completion check hooks
      const user = new User(profile);
      await user.save();
      console.log(`Seeded user: ${user.name} (${user.email}) - complete: ${user.isProfileComplete}`);
    }

    console.log('Successfully seeded 10 highly premium profiles directly to the Database! 🚀');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
