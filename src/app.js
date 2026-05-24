import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import AppError from './utils/AppError.js';
import globalErrorHandler from './middleware/error.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import swipeRoutes from './modules/swipe/swipe.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';

// Resolve __dirname under ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1) GLOBAL MIDDLEWARES
app.use(cors());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Static file serving for uploaded photos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 2) API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/chats', chatRoutes);

// 3) UNHANDLED ROUTE HANDLER
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 4) GLOBAL ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

export default app;
