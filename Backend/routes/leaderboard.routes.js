import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

// =============================================================================
// 1. GET LEADERBOARD (Ranked Coders)
// =============================================================================
router.get('/leaderboard', async (req, res) => {
  const { college, sort_by = 'total_solved', search, page = 1, limit = 50 } = req.query;
  const db = await getDb();

  try {
    let whereClauses = [];
    let params = [];

    if (college && college.toLowerCase() !== 'all') {
      whereClauses.push('u.college = ?');
      params.push(college);
    }

    if (search && search.trim()) {
      whereClauses.push('(LOWER(u.username) LIKE ? OR LOWER(u.full_name) LIKE ?)');
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderSql = 'total_solved DESC, cf_rating DESC';
    if (sort_by === 'cf_rating') {
      orderSql = 'cf_rating DESC, total_solved DESC';
    } else if (sort_by === 'lc_solved') {
      orderSql = 'lc_solved DESC, total_solved DESC';
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const query = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.college,
        u.avatar_url,
        COALESCE(SUM(CASE WHEN ca.platform = 'leetcode' THEN ca.total_solved ELSE 0 END), 0) AS lc_solved,
        COALESCE(MAX(CASE WHEN ca.platform = 'codeforces' THEN ca.rating ELSE 0 END), 0) AS cf_rating,
        COALESCE(MAX(CASE WHEN ca.platform = 'codeforces' THEN ca.max_rating ELSE 0 END), 0) AS cf_max_rating,
        COALESCE(SUM(CASE WHEN ca.platform = 'codechef' THEN ca.total_solved ELSE 0 END), 0) AS cc_solved,
        COALESCE(SUM(ca.total_solved), 0) AS total_solved,
        MAX(CASE WHEN ca.platform = 'leetcode' THEN ca.handle ELSE NULL END) AS lc_handle,
        MAX(CASE WHEN ca.platform = 'codeforces' THEN ca.handle ELSE NULL END) AS cf_handle,
        MAX(CASE WHEN ca.platform = 'codechef' THEN ca.handle ELSE NULL END) AS cc_handle,
        COUNT(ca.id) AS handle_count
      FROM users u
      LEFT JOIN connected_accounts ca ON ca.user_id = u.id
      ${whereSql}
      GROUP BY u.id
      HAVING COUNT(ca.id) > 0
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit, 10), offset);
    const rows = await db.all(query, params);

    const results = rows.map((row, idx) => ({
      rank: offset + idx + 1,
      id: row.id,
      username: row.username,
      full_name: row.full_name || row.username,
      college: row.college || 'Other',
      avatar_url: row.avatar_url,
      lc_solved: row.lc_solved,
      cf_rating: row.cf_rating,
      cf_max_rating: row.cf_max_rating,
      cc_solved: row.cc_solved,
      total_solved: row.total_solved,
      lc_handle: row.lc_handle,
      cf_handle: row.cf_handle,
      cc_handle: row.cc_handle,
      handle_count: row.handle_count
    }));

    res.json({ results, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ detail: 'Failed to fetch leaderboard.' });
  }
});

// =============================================================================
// 2. COLLEGE SUMMARY
// =============================================================================
router.get('/leaderboard/colleges', async (req, res) => {
  const db = await getDb();

  try {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.college,
        COALESCE(SUM(ca.total_solved), 0) AS total_solved,
        COALESCE(MAX(CASE WHEN ca.platform = 'codeforces' THEN ca.rating ELSE 0 END), 0) AS cf_rating
      FROM users u
      LEFT JOIN connected_accounts ca ON ca.user_id = u.id
      GROUP BY u.id
      HAVING COUNT(ca.id) > 0
    `;

    const rows = await db.all(query);
    const collegeMap = {};

    for (const r of rows) {
      const college = r.college || 'Other';
      if (!collegeMap[college]) {
        collegeMap[college] = {
          college,
          total_coders: 0,
          total_solved: 0,
          cf_ratings: [],
          top_coder: null,
          top_coder_solved: 0
        };
      }

      const c = collegeMap[college];
      c.total_coders += 1;
      c.total_solved += r.total_solved;

      if (r.cf_rating > 0) {
        c.cf_ratings.push(r.cf_rating);
      }

      if (r.total_solved >= c.top_coder_solved) {
        c.top_coder_solved = r.total_solved;
        c.top_coder = r.full_name || r.username;
      }
    }

    const colleges = Object.values(collegeMap).map(c => ({
      college: c.college,
      total_coders: c.total_coders,
      total_solved: c.total_solved,
      avg_cf_rating: c.cf_ratings.length > 0 ? Math.round(c.cf_ratings.reduce((a, b) => a + b, 0) / c.cf_ratings.length) : 0,
      top_coder: c.top_coder,
      top_coder_solved: c.top_coder_solved
    }));

    colleges.sort((a, b) => b.total_solved - a.total_solved);
    res.json(colleges);
  } catch (err) {
    console.error('Colleges error:', err);
    res.status(500).json({ detail: 'Failed to fetch college summary.' });
  }
});

export default router;
