import 'dotenv/config';

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

import cron from 'node-cron';
import connectDB from './config/db.js';
import app from './app.js';
import { initSocket } from './services/socketService.js';
import { expireStaleAccess } from './modules/payment/payment.service.js';

// Connect to Database
connectDB();

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
});

// Initialize Socket.IO Real-Time engine
initSocket(server);

// ─── Cron Job: Expire Stale Chat Access ────────────────────────────────────
// Runs every hour to find and expire chat access records past their expiryDate.
// This automatically locks chats when the 24-hour paid window has elapsed.
cron.schedule('0 * * * *', async () => {
  try {
    const count = await expireStaleAccess();
    if (count > 0) {
      console.log(`[Cron] Chat access expiry job completed: ${count} records expired`);
    }
  } catch (err) {
    console.error('[Cron] Error running chat access expiry job:', err);
  }
}, {
  timezone: 'Asia/Kolkata',
});

console.log('[Cron] Chat access expiry job scheduled (runs every hour)');

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

