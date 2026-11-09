import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'algotrack-dev-secret-key-super-secure-2026-nsut-dtu';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or invalid authentication token. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await getDb();
    const user = await db.get('SELECT id, username, email, full_name, college, avatar_url FROM users WHERE id = ?', [decoded.sub]);

    if (!user) {
      return res.status(401).json({ detail: 'User session not found or deleted.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid or expired session token. Please log in again.' });
  }
}
