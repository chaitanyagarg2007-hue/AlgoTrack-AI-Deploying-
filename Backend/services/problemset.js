import axios from 'axios';

// In-memory caches with 1-hour TTL
let cfProblemCache = { data: [], lastFetched: 0 };
let lcProblemCache = new Map(); // key: `${difficulty}_${topic}`, value: { data: [], lastFetched }
const userSolvedCache = new Map();

// Tag mappings for Codeforces
const CF_TOPIC_TAG_MAP = {
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

// Tag mappings for LeetCode
const LC_TAG_MAP = {
  'arrays': 'array',
  'two pointers': 'two-pointers',
  'binary search': 'binary-search',
  'dynamic programming': 'dynamic-programming',
  'dp': 'dynamic-programming',
  'graphs': 'graph',
  'greedy': 'greedy',
  'math': 'math',
  'strings': 'string'
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
 * 3. Fetch Full LeetCode Problemset via Official GraphQL (4,000+ problems)
 */
async function getLeetCodeProblems({ topic = 'All', difficulty = 'All', limit = 12 }) {
  const cacheKey = `${difficulty}_${topic}`;
  const now = Date.now();
  const cached = lcProblemCache.get(cacheKey);

  if (cached && now - cached.lastFetched < 3600 * 1000) {
    return cached.data;
  }

  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          questionFrontendId
          title
          titleSlug
          difficulty
          topicTags {
            name
            slug
          }
        }
      }
    }
  `;

  const filters = {};
  if (difficulty && difficulty.toLowerCase() !== 'all') {
    filters.difficulty = difficulty.toUpperCase();
  }

  const lcTag = LC_TAG_MAP[topic.toLowerCase()];
  if (lcTag) {
    filters.tags = [lcTag];
  }

  // Random skip to always give fresh batches of problems!
  const randomSkip = Math.floor(Math.random() * 50);

  try {
    const res = await axios.post(
      'https://leetcode.com/graphql',
      {
        query,
        variables: {
          categorySlug: '',
          limit: limit * 2,
          skip: randomSkip,
          filters
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 10000
      }
    );

    const questions = res.data?.data?.problemsetQuestionList?.questions || [];
    const formatted = questions.map(q => ({
      id: `lc-${q.questionFrontendId}-${q.titleSlug}`,
      title: `${q.questionFrontendId}. ${q.title}`,
      platform: 'LeetCode',
      difficulty: q.difficulty,
      rating: q.difficulty === 'Easy' ? 1000 : (q.difficulty === 'Hard' ? 1900 : 1400),
      tags: (q.topicTags || []).map(t => t.name),
      url: `https://leetcode.com/problems/${q.titleSlug}/`,
      sample_input: 'Standard LeetCode input (function arguments)',
      sample_output: 'Return statement result',
      constraints: `Official LeetCode ${q.difficulty} Problem`,
      description: `Official LeetCode Problem #${q.questionFrontendId}. Click 'Solve on LeetCode' to read the full interactive problem description, test cases, and submit your code directly on LeetCode!`,
      starter_template_cpp: `// LeetCode ${q.questionFrontendId}: ${q.title}\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Write your solution here\n};\n\nint main() {\n    Solution sol;\n    cout << "Test your solution locally" << endl;\n    return 0;\n}`,
      starter_template_py: `# LeetCode ${q.questionFrontendId}: ${q.title}\nclass Solution:\n    def solve(self):\n        pass\n\nif __name__ == '__main__':\n    print("Test locally")`
    }));

    if (formatted.length > 0) {
      lcProblemCache.set(cacheKey, { data: formatted, lastFetched: now });
      return formatted;
    }
  } catch (err) {
    console.warn('LeetCode problemset fetch error:', err.message);
  }

  return [];
}

/**
 * 4. Fetch & Cache Codeforces 11,500+ Problemset
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
 * 5. Fetch CodeChef Live Problemset (21,000+ problems API + curated fallback)
 */
async function getCodeChefProblems({ topic = 'All', difficulty = 'All', limit = 10 }) {
  const normalizedDiff = difficulty.toLowerCase();

  try {
    // Determine sort/page offset based on difficulty
    let page = 1;
    let sortOrder = 'asc';
    if (normalizedDiff === 'medium') {
      page = 15;
    } else if (normalizedDiff === 'hard') {
      sortOrder = 'desc';
      page = 1;
    }

    const res = await axios.get(
      `https://www.codechef.com/api/list/problems?page=${page}&limit=${limit * 2}&sort_by=difficulty_rating&sort_order=${sortOrder}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 8000
      }
    );

    const items = res.data?.data || [];
    const valid = items.filter(p => p.code && p.name && !p.name.startsWith('C - ')).map(p => {
      const rating = parseInt(p.difficulty_rating || '1200', 10);
      let diffStr = 'Medium';
      if (rating < 1200 && rating > 0) diffStr = 'Easy';
      if (rating >= 1800) diffStr = 'Hard';

      return {
        id: `cc-${p.code}`,
        title: p.name,
        platform: 'CodeChef',
        difficulty: diffStr,
        rating: rating > 0 ? rating : 1200,
        tags: ['CodeChef Practice'],
        url: `https://www.codechef.com/problems/${p.code}`,
        sample_input: 'Standard input format on CodeChef (cin / sys.stdin)',
        sample_output: 'Standard output format on CodeChef (cout / sys.stdout)',
        constraints: `CodeChef Rating: ${rating > 0 ? rating : 'Unrated'} | Time Limit: 1.0s`,
        description: `Official CodeChef problem (${p.code}). Click 'Solve on CodeChef' to open the interactive problem statement and test your solution on the official judge.`,
        starter_template_cpp: `// CodeChef: ${p.name} (${p.code})\n#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int t = 1;\n    if (cin >> t) {\n        while (t--) {\n            // Write solution here\n        }\n    }\n    return 0;\n}`,
        starter_template_py: `# CodeChef: ${p.name} (${p.code})\nimport sys\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    # Write solution here\n    pass\n\nif __name__ == '__main__':\n    main()`
      };
    });

    if (valid.length > 0) {
      return valid.slice(0, limit);
    }
  } catch (err) {
    console.warn('CodeChef live problemset error:', err.message);
  }

  // Fallback curated set
  return [
    { id: 'cc-FLOW001', title: 'Add Two Numbers', platform: 'CodeChef', difficulty: 'Easy', rating: 400, tags: ['Basic Math'], url: 'https://www.codechef.com/problems/FLOW001', starter_template_cpp: '// CodeChef: FLOW001\n#include <iostream>\nusing namespace std;\nint main() { int t, a, b; if(cin >> t) while(t--) { cin >> a >> b; cout << (a + b) << endl; } return 0; }' },
    { id: 'cc-CARVANS', title: 'Carvans', platform: 'CodeChef', difficulty: 'Easy', rating: 1200, tags: ['Arrays', 'Greedy'], url: 'https://www.codechef.com/problems/CARVANS', starter_template_cpp: '// CodeChef: CARVANS\n#include <iostream>\nusing namespace std;\nint main() { return 0; }' },
    { id: 'cc-SUBINC', title: 'Count Subarrays', platform: 'CodeChef', difficulty: 'Medium', rating: 1350, tags: ['DP', 'Arrays'], url: 'https://www.codechef.com/problems/SUBINC', starter_template_cpp: '// CodeChef: SUBINC\n#include <iostream>\nusing namespace std;\nint main() { return 0; }' },
    { id: 'cc-STPAR', title: 'Street Parade', platform: 'CodeChef', difficulty: 'Medium', rating: 1400, tags: ['Stack', 'Two Pointers'], url: 'https://www.codechef.com/problems/STPAR', starter_template_cpp: '// CodeChef: STPAR\n#include <iostream>\nusing namespace std;\nint main() { return 0; }' },
    { id: 'cc-FIRESC', title: 'Fire Escape Routes', platform: 'CodeChef', difficulty: 'Hard', rating: 1680, tags: ['Graphs'], url: 'https://www.codechef.com/problems/FIRESC', starter_template_cpp: '// CodeChef: FIRESC\n#include <iostream>\nusing namespace std;\nint main() { return 0; }' }
  ];
}

/**
 * 6. Master Universal Problemset Query Engine
 * Combines 4,100+ LeetCode, 11,500+ Codeforces, and 21,000+ CodeChef Problems!
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

  // --- A. LEETCODE STREAM (4,100+ Questions) ---
  if (normalizedPlat === 'all' || normalizedPlat === 'leetcode') {
    const lcLimit = normalizedPlat === 'leetcode' ? limit : Math.ceil(limit / 3);
    const lcProblems = await getLeetCodeProblems({ topic, difficulty, limit: lcLimit });
    problems.push(...lcProblems.slice(0, lcLimit));
  }

  // --- B. CODEFORCES STREAM (11,500+ Questions) ---
  if (normalizedPlat === 'all' || normalizedPlat === 'codeforces') {
    const cfLimit = normalizedPlat === 'codeforces' ? limit : Math.ceil(limit / 3);
    const rawCF = await getCodeforcesProblems();
    
    let cfFiltered = rawCF.filter(p => {
      if (!p.rating) return false;

      // Filter out user's already solved questions!
      const problemKey = `${p.contestId}${p.index}`;
      if (solvedSet.has(problemKey)) return false;

      // Difficulty filter
      if (normalizedDiff === 'easy' && p.rating > 1200) return false;
      if (normalizedDiff === 'medium' && (p.rating <= 1200 || p.rating > 1800)) return false;
      if (normalizedDiff === 'hard' && p.rating <= 1800) return false;

      // Topic filter
      if (normalizedTopic !== 'all') {
        const requiredTags = CF_TOPIC_TAG_MAP[normalizedTopic] || [normalizedTopic];
        const hasTag = (p.tags || []).some(t => requiredTags.includes(t.toLowerCase()));
        if (!hasTag) return false;
      }

      return true;
    });

    // Pick random subset for freshness
    cfFiltered = cfFiltered.sort(() => 0.5 - Math.random()).slice(0, cfLimit);

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
        description: `Official Codeforces problem (${p.contestId}${p.index}). Click 'Solve on Codeforces' to view full testcases, constraints, and submit directly on Codeforces to increase your rating!`,
        starter_template_cpp: `// Problem: ${p.name} (Codeforces ${p.contestId}${p.index})\n#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvoid solve() {\n    // Write your solution here\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int t = 1;\n    // cin >> t; // Uncomment if multiple testcases\n    while (t--) solve();\n    return 0;\n}`,
        starter_template_py: `# Problem: ${p.name} (Codeforces ${p.contestId}${p.index})\nimport sys\n\ndef solve():\n    # Write your solution here\n    pass\n\ndef main():\n    input = sys.stdin.read\n    # Write input parsing here\n    solve()\n\nif __name__ == '__main__':\n    main()`
      });
    }
  }

  // --- C. CODECHEF STREAM (21,000+ Questions) ---
  if (normalizedPlat === 'all' || normalizedPlat === 'codechef') {
    const ccLimit = normalizedPlat === 'codechef' ? limit : Math.ceil(limit / 3);
    const ccProblems = await getCodeChefProblems({ topic, difficulty, limit: ccLimit });
    problems.push(...ccProblems.slice(0, ccLimit));
  }

  return problems;
}
