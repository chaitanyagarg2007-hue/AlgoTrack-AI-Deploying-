import express from 'express';
import { fetchUpcomingContests } from '../services/contests.js';

const router = express.Router();

router.get('/upcoming-contests', async (req, res) => {
  const days = parseInt(req.query.days || '7', 10);
  try {
    const contests = await fetchUpcomingContests(days);
    res.json(contests);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to fetch upcoming contests.' });
  }
});

export default router;
