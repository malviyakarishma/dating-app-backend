<div align="center">
  <!-- [LOGO_PLACEHOLDER: Add App Logo Here] -->
  <h1>⚙️ Dating App - Backend</h1>
  
  <p>
    <strong>The robust Node.js REST API powering the Dating App, featuring real-time Socket.io communication, MongoDB storage, and Stripe integration.</strong>
  </p>

  <!-- Badges -->
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens" alt="JWT" />
</div>

<br />

## 📖 Project Overview

This repository contains the backend server for the Dating App. It exposes a secure REST API to manage users, authentication, swipes, and matches. It also maintains a persistent WebSocket server (using Socket.io) to deliver real-time chat messages and immediate push events when two users match.

---

## ✨ API & Architecture Overview

* **RESTful Architecture:** Clear separation of routes, controllers, services, and models.
* **Authentication & Authorization:** Secure JWT-based auth with middleware protecting private routes.
* **Real-time WebSockets:** Socket.io handles live chat and match events asynchronously.
* **Database Management:** MongoDB with Mongoose ORM for structured schemas and relationships.
* **Media Storage:** Integration with Cloudinary for handling and serving profile images.
* **Payments:** Stripe webhook handling to upgrade user tiers and manage subscriptions.

---

## 🛠️ Technologies Used

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB & Mongoose
* **WebSockets:** Socket.io
* **Authentication:** JSON Web Tokens (JWT), bcryptjs, Google Auth Library
* **File Uploads:** Multer, Cloudinary
* **Payments:** Stripe
* **Email:** Nodemailer
* **Validation:** Joi schemas
* **Scheduling:** Node-cron (for cleaning up expired data)

---

## 📂 Folder Structure Explanation

```text
dating-app-backend/
├── src/
│   ├── config/             # DB connections, Cloudinary setup, Environment config
│   ├── controllers/        # Request/Response handlers
│   ├── middlewares/        # Auth verification, Error handling, Rate limiting
│   ├── models/             # Mongoose schemas (User, Match, Message)
│   ├── routes/             # Express API route definitions
│   ├── services/           # Business logic (Emails, Stripe webhooks, Matching algorithm)
│   ├── utils/              # Helper functions, custom error classes
│   └── server.js           # Server entry point and Socket.io initialization
├── .env.example            # Environment variables template
└── package.json            # Project dependencies and scripts
```

---

## ⚙️ Installation Steps

### Prerequisites
* Node.js (v18 or newer recommended)
* MongoDB (Local instance or MongoDB Atlas)
* A Cloudinary Account (for image uploads)
* A Stripe Developer Account (for payments)

### Setup
1. **Clone the repository:**
   ```bash
   git clone <backend-repo-url>
   cd dating-app-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file based on the provided `.env.example`:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<user>:<password>@cluster...
   JWT_SECRET=your_super_secret_jwt_key
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   CLOUDINARY_URL=cloudinary://...
   SMTP_HOST=smtp.mailtrap.io
   SMTP_USER=...
   SMTP_PASS=...
   ```

---

## 🚀 Running Locally

Start the development server (uses `nodemon` for hot-reloading):
```bash
npm run dev
```

Start the production server:
```bash
npm start
```
The server will run on `http://localhost:5000` (or the port specified in `.env`).

---

## 🔄 Core Systems & Workflows

### 🔐 Authentication & Authorization
* **JWT Flow:** Upon successful login/registration, a JWT is returned. Clients include this in the `Authorization: Bearer <token>` header.
* **Email Verification:** Registration triggers Nodemailer to send a verification link. Unverified users have restricted access.
* **Password Reset:** Generates a secure, time-limited token for password recovery.

### ❤️ User Matching Logic
* Handled in `swipes.controller.js`.
* When User A swipes right on User B, it's recorded.
* If User B later swipes right on User A, the backend detects the mutual like, creates a `Match` document, and emits a `new_match` event via Socket.io to both active users.
* **Rate Limiting:** Users are restricted to a certain number of swipes per day unless they hold a Premium tier.

### 💬 Chat System
* Messages are saved to the database via REST endpoints (`POST /api/chats`) and concurrently broadcasted via Socket.io to the specific chat room.

### 💳 Payment Integration (Stripe)
* Exposes an endpoint to create Stripe Checkout sessions.
* Crucially, includes a Webhook endpoint (`/api/webhooks/stripe`) that listens for `checkout.session.completed` events to securely upgrade the user's account status.

---

## 🔒 Security Practices

* **Validation:** All incoming request bodies are validated using `Joi` before hitting the controllers.
* **Password Security:** Passwords are never stored in plain text (hashed via `bcryptjs`).
* **Error Handling:** Centralized error handling middleware intercepts thrown errors and formats them into a consistent JSON response. Do not leak stack traces in production.
* **Rate Limiting:** IP-based rate limiting on sensitive routes (like `/login` and `/swipes`) to prevent abuse.

---

## 📚 API Documentation

*(Generate or link to Swagger/Postman documentation here)*

**Common Endpoints:**
* `POST /api/auth/register` - Register a new user
* `POST /api/auth/login` - Login and receive JWT
* `GET /api/users/discover` - Fetch potential matches
* `POST /api/swipes` - Record a left/right swipe
* `GET /api/chats/:matchId` - Retrieve conversation history

---

## 🌍 Deployment & Production Checklist

When deploying to platforms like Render, Heroku, or AWS:
1. Ensure all environment variables are properly set in the host dashboard.
2. Ensure MongoDB Atlas accepts connections from the hosting provider's IP range (or `0.0.0.0/0`).
3. Set `NODE_ENV=production` to enable performance optimizations and disable stack traces in errors.
4. Update the Stripe Webhook URL in the Stripe Dashboard to point to your production URL.
5. Setup a process manager like PM2 if deploying on a raw VPS.

---

## 🤝 Contributing Guidelines

1. Fork the repository.
2. Create a feature branch (`git checkout -b backend/NewFeature`).
3. Commit your changes (`git commit -m 'Add new backend feature'`).
4. Push to the branch (`git push origin backend/NewFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the ISC License. See `LICENSE` for more information.
