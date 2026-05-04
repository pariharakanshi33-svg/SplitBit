/**
 * Smart Bill Splitter — Entry Point
 * 
 * Sets up Express server with CORS, JSON parsing, file upload support,
 * and registers all API routes.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Route imports
const billRoutes = require('./routes/billRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const settlementRoutes = require('./routes/settlementRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded bill images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api', billRoutes);
app.use('/api', userRoutes);
app.use('/api', groupRoutes);
app.use('/api', settlementRoutes);

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SplitBit API' });
});

const errorHandler = require('./middleware/errorHandler');

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🧾 SplitBit API running on http://localhost:${PORT}`);
  console.log(`📊 API docs: http://localhost:${PORT}/api/health`);
});

module.exports = app;
