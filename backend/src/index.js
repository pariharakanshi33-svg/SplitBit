/**
 * Smart Bill Splitter — Entry Point (Production)
 *
 * Sets up Express server with Clerk middleware, CORS, JSON parsing,
 * file upload support, and registers all API routes.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { clerkMiddleware } = require('@clerk/express');

// Route imports
const authRoutes = require('./routes/authRoutes');
const billRoutes = require('./routes/billRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Clerk Middleware (global — must be before routes) ────────
app.use(clerkMiddleware());

// ─── Body Parsing ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health Check (public) ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SplitBit API', version: '2.0.0' });
});

// ─── API Routes ───────────────────────────────────────────────
app.use('/api', authRoutes);      // POST /api/auth/sync (public-ish)
app.use('/api', billRoutes);      // All protected
app.use('/api', userRoutes);      // All protected
app.use('/api', groupRoutes);     // All protected
app.use('/api', settlementRoutes);// All protected

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🧾 SplitBit API running on http://localhost:${PORT}`);
  console.log(`🔐 Clerk authentication: enabled`);
  console.log(`🐘 Database: Neon PostgreSQL`);
});

module.exports = app;
