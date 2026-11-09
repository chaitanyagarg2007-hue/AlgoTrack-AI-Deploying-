import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb } from './db.js';

import authRoutes from './routes/auth.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import profileRoutes from './routes/profile.routes.js';
import contestsRoutes from './routes/contests.routes.js';
import practiceRoutes from './routes/practice.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
const corsOrigins = process.env.CORS_ORIGINS || '*';
app.use(cors({
  origin: corsOrigins === '*' ? '*' : corsOrigins.split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json());

// Mount All API Routes matching the frontend exactly
app.use('/api/v1', authRoutes);
app.use('/api/v1', leaderboardRoutes);
app.use('/api/v1', profileRoutes);
app.use('/api/v1', contestsRoutes);
app.use('/api/v1', practiceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AlgoTrack Node.js Backend', time: new Date().toISOString() });
});

// Root welcome
app.get('/', (req, res) => {
  res.json({
    message: '⚡ Welcome to AlgoTrack AI API (Node.js Express Engine)',
    docs: 'Endpoints available at /api/v1/*'
  });
});

// Start Server & Initialize Database
async function startServer() {
  try {
    await getDb();
    app.listen(PORT, () => {
      console.log(`🚀 AlgoTrack Node.js Backend running on http://localhost:${PORT}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
