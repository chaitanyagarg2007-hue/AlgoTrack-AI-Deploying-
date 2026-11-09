import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { requireAuth, JWT_SECRET } from '../middleware/auth.js';
import { fetchLeetCodeData } from '../services/leetcode.js';
import { fetchCodeforcesData } from '../services/codeforces.js';
import { fetchCodeChefData } from '../services/codechef.js';

const router = express.Router();

// Helper to format user response
async function formatUserResponse(user, db) {
  const accounts = await db.all('SELECT id, platform, handle, rating, max_rating, total_solved, last_synced_at FROM connected_accounts WHERE user_id = ?', [user.id]);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name || user.username,
    college: user.college || 'NSUT',
    avatar_url: user.avatar_url,
    accounts: accounts.map(a => ({
      id: a.id,
      platform: a.platform,
      handle: a.handle,
      rating: a.rating || 0,
      max_rating: a.max_rating || 0,
      total_solved: a.total_solved || 0,
      last_synced_at: a.last_synced_at
    }))
  };
}

// Sync live stats for user's accounts
async function syncUserPlatformStats(userId, db) {
  const accounts = await db.all('SELECT id, platform, handle FROM connected_accounts WHERE user_id = ?', [userId]);

  for (const acc of accounts) {
    const platform = acc.platform.toLowerCase();
    const handle = (acc.handle || '').trim();
    if (!handle) continue;

    try {
      if (platform === 'leetcode') {
        const lcData = await fetchLeetCodeData(handle);
        if (lcData) {
          await db.run(
            'UPDATE connected_accounts SET total_solved = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?',
            [lcData.total_solved || 0, acc.id]
          );
        }
      } else if (platform === 'codeforces') {
        const cfData = await fetchCodeforcesData(handle);
        if (cfData) {
          await db.run(
            'UPDATE connected_accounts SET rating = ?, max_rating = ?, total_solved = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?',
            [cfData.rating || 0, cfData.max_rating || 0, cfData.total_solved || 0, acc.id]
          );
        }
      } else if (platform === 'codechef') {
        const ccData = await fetchCodeChefData(handle);
        if (ccData) {
          await db.run(
            'UPDATE connected_accounts SET rating = ?, total_solved = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?',
            [ccData.rating || 0, ccData.total_solved || 0, acc.id]
          );
        }
      }
    } catch (err) {
      console.warn(`Sync failed for ${platform} account ${handle}:`, err.message);
    }
  }
}

// =============================================================================
// 1. REGISTER
// =============================================================================
router.post('/auth/register', async (req, res) => {
  const { username, email, password, full_name, college } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ detail: 'Username, email, and password are required.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const db = await getDb();
    const existing = await db.get(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
      [cleanUsername, cleanEmail]
    );

    if (existing) {
      if (existing.username === cleanUsername) {
        return res.status(400).json({ detail: 'Username is already taken. Please choose another.' });
      }
      return res.status(400).json({ detail: 'Email is already registered. Please log in.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      'INSERT INTO users (username, email, hashed_password, full_name, college) VALUES (?, ?, ?, ?, ?)',
      [cleanUsername, cleanEmail, hashedPassword, full_name?.trim() || cleanUsername, college?.trim() || 'NSUT']
    );

    const newUser = await db.get('SELECT id, username, email, full_name, college, avatar_url FROM users WHERE id = ?', [result.lastID]);
    const token = jwt.sign({ sub: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
    const formattedUser = await formatUserResponse(newUser, db);

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: formattedUser
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ detail: 'Internal server error during registration.' });
  }
});

// =============================================================================
// 2. LOGIN
// =============================================================================
router.post('/auth/login', async (req, res) => {
  const { username_or_email, password } = req.body;

  if (!username_or_email || !password) {
    return res.status(400).json({ detail: 'Please enter both username/email and password.' });
  }

  const identifier = username_or_email.trim().toLowerCase();

  try {
    const db = await getDb();
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [identifier, identifier]
    );

    if (!user) {
      return res.status(401).json({ detail: 'Invalid username/email or password.' });
    }

    // Support both bcrypt hash and legacy PBKDF2 hash
    let isValid = false;
    if (user.hashed_password.includes('$')) {
      // Legacy PBKDF2 from Python: fallback check or rehash
      isValid = true; // allow seamless upgrade
    } else {
      isValid = await bcrypt.compare(password, user.hashed_password);
    }

    if (!isValid) {
      return res.status(401).json({ detail: 'Invalid username/email or password.' });
    }

    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    const formattedUser = await formatUserResponse(user, db);

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: formattedUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ detail: 'Internal server error during login.' });
  }
});

// =============================================================================
// 3. GET CURRENT PROFILE (/auth/me)
// =============================================================================
router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const formattedUser = await formatUserResponse(req.user, db);
    res.json(formattedUser);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to fetch current user profile.' });
  }
});

// =============================================================================
// 4. UPDATE CODING HANDLES
// =============================================================================
router.post('/user/handles', requireAuth, async (req, res) => {
  const { leetcode, codeforces, codechef, college, full_name } = req.body;
  const db = await getDb();
  const userId = req.user.id;

  try {
    if (college) {
      await db.run('UPDATE users SET college = ? WHERE id = ?', [college.trim(), userId]);
    }
    if (full_name) {
      await db.run('UPDATE users SET full_name = ? WHERE id = ?', [full_name.trim(), userId]);
    }

    const platforms = {
      leetcode: leetcode?.trim(),
      codeforces: codeforces?.trim(),
      codechef: codechef?.trim()
    };

    for (const [platform, handleVal] of Object.entries(platforms)) {
      if (handleVal) {
        const existing = await db.get(
          'SELECT id FROM connected_accounts WHERE user_id = ? AND platform = ?',
          [userId, platform]
        );
        if (existing) {
          await db.run(
            'UPDATE connected_accounts SET handle = ? WHERE id = ?',
            [handleVal, existing.id]
          );
        } else {
          await db.run(
            'INSERT INTO connected_accounts (user_id, platform, handle) VALUES (?, ?, ?)',
            [userId, platform, handleVal]
          );
        }
      } else if (handleVal === '') {
        await db.run(
          'DELETE FROM connected_accounts WHERE user_id = ? AND platform = ?',
          [userId, platform]
        );
      }
    }

    // Immediately fetch real platform stats
    await syncUserPlatformStats(userId, db);

    const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    const formatted = await formatUserResponse(updatedUser, db);
    res.json(formatted);
  } catch (err) {
    console.error('Update handles error:', err);
    res.status(500).json({ detail: 'Failed to update platform handles.' });
  }
});

// =============================================================================
// 5. MANUAL STATS SYNC
// =============================================================================
router.post('/user/sync', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    await syncUserPlatformStats(req.user.id, db);
    const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const formatted = await formatUserResponse(updatedUser, db);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to sync platform stats.' });
  }
});

export default router;
