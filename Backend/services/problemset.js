import axios from 'axios';

// In-memory cache for Codeforces problemset (1-hour TTL)
let cfProblemCache = {
  data: [],
  lastFetched: 0
};

// In-memory cache for user's solved problems
const userSolvedCache = new Map();

// Tag mappings for topic filtering
const TOPIC_TAG_MAP = {
  'arrays': ['data structures', 'implementation', 'sortings'],
  'two pointers': ['two pointers', 'sortings'],
  'binary search': ['binary search'],
  'dynamic programming': ['dp'],
  'dp': ['dp'],
  'graphs': ['graphs', 'dfs and similar', 'trees', 'shortest paths'],
  'greedy': ['greedy'],
  'math': ['math', 'number theory', 'combinatorics'],
  'strings': ['strings']
};

/**
 * 1. Fetch LeetCode Daily Problem of the Day (POTD)
 */
export async function fetchLeetCodePOTD() {
  const query = `
    query questionOfToday {
      activeDailyCodingChallengeQuestion {
        date
        link
        question {
          questionFrontendId
          title
          titleSlug
          difficulty
          topicTags {
            name
          }
        }
      }
    }
  `;

  try {
    const res = await axios.post(
      'https://leetcode.com/graphql',
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 8000
      }
    );

    const challenge = res.data?.data?.activeDailyCodingChallengeQuestion;
    if (!challenge || !challenge.question) return null;

    const q = challenge.question;
    return {
      date: challenge.date,
      id: `lc-potd-${q.titleSlug}`,
      title: `${q.questionFrontendId ? q.questionFrontendId + '. ' : ''}${q.title}`,
      titleSlug: q.titleSlug,
      platform: 'LeetCode',
      difficulty: q.difficulty || 'Medium',
      url: `https://leetcode.com${challenge.link}`,
      tags: (q.topicTags || []).map(t => t.name)
    };
  } catch (err) {
    console.warn('LeetCode POTD fetch warning:', err.message);
    // Fallback POTD
    return {
      date: new Date().toISOString().split('T')[0],
      id: 'lc-potd-fallback',
      title: 'Daily Coding Challenge',
      titleSlug: 'two-sum',
      platform: 'LeetCode',
      difficulty: 'Medium',
      url: 'https://leetcode.com/problemset/all/',
      tags: ['Array', 'Hash Table']
    };
  }
}

/**
 * 2. Fetch User's Solved Problems on Codeforces
 */
export async function fetchUserSolvedCF(handle) {
  if (!handle) return new Set();

  const cacheKey = handle.toLowerCase();
  const cached = userSolvedCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < 10 * 60 * 1000) {
    return cached.solvedSet;
  }

  try {
    const res = await axios.get(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=1000`,
      { timeout: 8000 }
    );

    const solvedSet = new Set();
    if (res.data?.status === 'OK') {
      const subs = res.data.result || [];
      for (const s of subs) {
        if (s.verdict === 'OK' && s.problem?.contestId && s.problem?.index) {
          solvedSet.add(`${s.problem.contestId}${s.problem.index}`);
        }
      }
    }

    userSolvedCache.set(cacheKey, { solvedSet, timestamp: now });
    return solvedSet;
  } catch (err) {
    console.warn(`CF user solved fetch failed for @${handle}:`, err.message);
    return new Set();
  }
}

/**
 * 3. Fetch & Cache Codeforces 9,000+ Problemset
 */
async function getCodeforcesProblems() {
  const now = Date.now();
  if (cfProblemCache.data.length > 0 && now - cfProblemCache.lastFetched < 3600 * 1000) {
    return cfProblemCache.data;
  }

  try {
    const res = await axios.get('https://codeforces.com/api/problemset.problems', { timeout: 12000 });
    if (res.data?.status === 'OK' && res.data.result?.problems) {
      cfProblemCache = {
        data: res.data.result.problems,
        lastFetched: now
      };
      return cfProblemCache.data;
    }
  } catch (err) {
    console.warn('CF problemset fetch error:', err.message);
  }

  return cfProblemCache.data;
}

/**
 * 4. CodeChef Curated Problem Directory
 */
const CODECHEF_PROBLEMS = [
  { id: 'cc-FLOW001', code: 'FLOW001', title: 'Add Two Numbers', difficulty: 'Easy', rating: 400, tags: ['Basic Math', 'Warmup'], topic: 'math' },
  { id: 'cc-BUY1GET1', code: 'BUY1GET1', title: 'Buy1-Get1', difficulty: 'Easy', rating: 1050, tags: ['Strings', 'Greedy'], topic: 'strings' },
  { id: 'cc-LAPIN', code: 'LAPIN', title: 'Lapindromes', difficulty: 'Easy', rating: 1120, tags: ['Strings', 'Frequency Count'], topic: 'strings' },
  { id: 'cc-CSUB', code: 'CSUB', title: 'Count Substrings', difficulty: 'Easy', rating: 1180, tags: ['Strings', 'Combinatorics'], topic: 'strings' },
  { id: 'cc-CHN15A', code: 'CHN15A', title: 'Mutated Minions', difficulty: 'Easy', rating: 980, tags: ['Arrays', 'Math'], topic: 'arrays' },
  { id: 'cc-CARVANS', code: 'CARVANS', title: 'Carvans', difficulty: 'Easy', rating: 1200, tags: ['Arrays', 'Greedy'], topic: 'arrays' },
  { id: 'cc-SUBINC', code: 'SUBINC', title: 'Count Subarrays', difficulty: 'Medium', rating: 1350, tags: ['DP', 'Arrays'], topic: 'dp' },
  { id: 'cc-ALTARAY', code: 'ALTARAY', title: 'Alternating Subarray Prefix', difficulty: 'Medium', rating: 1380, tags: ['DP', 'Arrays'], topic: 'dp' },
  { id: 'cc-FROGV', code: 'FROGV', title: 'Frog Sort & Distance', difficulty: 'Medium', rating: 1520, tags: ['DP', 'Graphs', 'Sorting'], topic: 'graphs' },
  { id: 'cc-CONFLIP', code: 'CONFLIP', title: 'Coin Flip', difficulty: 'Medium', rating: 1250, tags: ['Greedy', 'Game Theory'], topic: 'greedy' },
  { id: 'cc-STPAR', code: 'STPAR', title: 'Street Parade', difficulty: 'Medium', rating: 1400, tags: ['Stack', 'Two Pointers'], topic: 'two pointers' },
  { id: 'cc-FIRESC', code: 'FIRESC', title: 'Fire Escape Routes', difficulty: 'Hard', rating: 1680, tags: ['Graphs', 'Connected Components'], topic: 'graphs' },
  { id: 'cc-GERGOVIA', code: 'GERGOVIA', title: 'Wine trading in Gergovia', difficulty: 'Medium', rating: 1450, tags: ['Greedy', 'Arrays'], topic: 'greedy' },
  { id: 'cc-DIVSUBS', code: 'DIVSUBS', title: 'Divisible Subset (Pigeonhole)', difficulty: 'Hard', rating: 1850, tags: ['Math', 'Pigeonhole Principle'], topic: 'math' }
];

/**
 * 5. Master Universal Problemset Query Engine
 */
export async function getUniversalProblemset({
  platform = 'All',
  topic = 'All',
  difficulty = 'All',
  cfHandle = '',
  limit = 12
} = {}) {
  const problems = [];
  const normalizedTopic = topic.toLowerCase().trim();
  const normalizedDiff = difficulty.toLowerCase().trim();
  const normalizedPlat = platform.toLowerCase().trim();

  // Fetch user solved set if CF handle is available
  const solvedSet = cfHandle ? await fetchUserSolvedCF(cfHandle) : new Set();

  // --- A. Codeforces Problems ---
  if (normalizedPlat === 'all' || normalizedPlat === 'codeforces') {
    const rawCF = await getCodeforcesProblems();
    let cfFiltered = rawCF.filter(p => {
      // Must have rating
      if (!p.rating) return false;

      // Filter out user's solved questions!
      const problemKey = `${p.contestId}${p.index}`;
      if (solvedSet.has(problemKey)) return false;

      // Difficulty filter
      if (normalizedDiff === 'easy' && p.rating > 1200) return false;
      if (normalizedDiff === 'medium' && (p.rating <= 1200 || p.rating > 1800)) return false;
      if (normalizedDiff === 'hard' && p.rating <= 1800) return false;

      // Topic filter
      if (normalizedTopic !== 'all') {
        const requiredTags = TOPIC_TAG_MAP[normalizedTopic] || [normalizedTopic];
        const hasTag = (p.tags || []).some(t => requiredTags.includes(t.toLowerCase()));
        if (!hasTag) return false;
      }

      return true;
    });

    // Shuffle and pick top N
    cfFiltered = cfFiltered.sort(() => 0.5 - Math.random()).slice(0, limit);

    for (const p of cfFiltered) {
      const diffStr = p.rating <= 1200 ? 'Easy' : (p.rating <= 1800 ? 'Medium' : 'Hard');
      problems.push({
        id: `cf-${p.contestId}-${p.index}`,
        title: `${p.name}`,
        platform: 'Codeforces',
        difficulty: diffStr,
        rating: p.rating,
        tags: p.tags || [],
        url: `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`,
        sample_input: 'Read from standard input (cin / sys.stdin)',
        sample_output: 'Write to standard output (cout / sys.stdout)',
        constraints: `Rating: ${p.rating} | Standard Time Limit: 1.0s - 2.0s`,
        description: `This is an official Codeforces problem (${p.contestId}${p.index}). Click 'Solve on Codeforces' to view full testcases, constraints, and submit directly on Codeforces to increase your rating!`,
        starter_template_cpp: `// Problem: ${p.name} (Codeforces ${p.contestId}${p.index})\n#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvoid solve() {\n    // Write your solution here\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int t = 1;\n    // cin >> t; // Uncomment if multiple testcases\n    while (t--) solve();\n    return 0;\n}`,
        starter_template_py: `# Problem: ${p.name} (Codeforces ${p.contestId}${p.index})\nimport sys\n\ndef solve():\n    # Write your solution here\n    pass\n\ndef main():\n    input = sys.stdin.read\n    # Write input parsing here\n    solve()\n\nif __name__ == '__main__':\n    main()`
      });
    }
  }

  // --- B. CodeChef Problems ---
  if (normalizedPlat === 'all' || normalizedPlat === 'codechef') {
    let ccFiltered = CODECHEF_PROBLEMS.filter(p => {
      if (normalizedDiff !== 'all' && p.difficulty.toLowerCase() !== normalizedDiff) return false;
      if (normalizedTopic !== 'all' && p.topic !== normalizedTopic && !p.tags.some(t => t.toLowerCase().includes(normalizedTopic))) return false;
      return true;
    });

    ccFiltered = ccFiltered.sort(() => 0.5 - Math.random()).slice(0, Math.ceil(limit / 2));

    for (const p of ccFiltered) {
      problems.push({
        id: p.id,
        title: p.title,
        platform: 'CodeChef',
        difficulty: p.difficulty,
        rating: p.rating,
        tags: p.tags,
        url: `https://www.codechef.com/problems/${p.code}`,
        sample_input: 'Standard input format on CodeChef',
        sample_output: 'Standard output format on CodeChef',
        constraints: `CodeChef Rating: ~${p.rating} | Time Limit: 1.0s`,
        description: `Official CodeChef problem (${p.code}). Click 'Solve on CodeChef' to open the interactive problem statement and test your solution on the official judge.`,
        starter_template_cpp: `// CodeChef: ${p.title} (${p.code})\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int t;\n    if (cin >> t) {\n        while (t--) {\n            // Write solution here\n        }\n    }\n    return 0;\n}`,
        starter_template_py: `# CodeChef: ${p.title} (${p.code})\nimport sys\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    # Write solution here\n    pass\n\nif __name__ == '__main__':\n    main()`
      });
    }
  }

  return problems;
}
