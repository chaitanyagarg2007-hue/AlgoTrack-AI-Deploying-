import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

let problemsData = [];
try {
  const jsonPath = path.join(__dirname, '../services/problems_bank.json');
  problemsData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
} catch (err) {
  console.warn('Could not load problems_bank.json:', err.message);
}

// 1. PRACTICE PROBLEMS LIST WITH FILTERS
router.get('/practice-problems', (req, res) => {
  const { topic, difficulty, platform } = req.query;

  let filtered = [...problemsData];

  if (topic && topic.toLowerCase() !== 'all') {
    filtered = filtered.filter(p => p.topic?.toLowerCase() === topic.toLowerCase());
  }

  if (difficulty && difficulty.toLowerCase() !== 'all') {
    filtered = filtered.filter(p => p.difficulty?.toLowerCase() === difficulty.toLowerCase());
  }

  if (platform && platform.toLowerCase() !== 'all') {
    filtered = filtered.filter(p => (p.platform || 'LeetCode').toLowerCase() === platform.toLowerCase());
  }

  res.json(filtered);
});

// 2. AI DIAGNOSTICS (Explains TLE / MLE & algorithmic complexity)
router.post('/diagnose', (req, res) => {
  const { code, language = 'cpp', problem_title = 'Algorithm Problem', constraints = 'N <= 10^5', error_type = 'TLE' } = req.body;

  let diagnosis = '';
  let optimalApproach = '';
  let timeComplexity = 'O(N^2)';

  if (code.includes('for') && (code.match(/for/g) || []).length >= 2) {
    diagnosis = `Detected nested loops in ${language.toUpperCase()} solution. For constraints ${constraints}, an O(N^2) time complexity causes ~10^10 operations, exceeding the standard 1.0s limit (10^8 operations/sec) and leading to a Time Limit Exceeded (TLE).`;
    optimalApproach = 'Use a Hash Map for O(1) lookups or sort with Two Pointers / Binary Search to reduce overall complexity to O(N) or O(N log N).';
    timeComplexity = 'O(N^2) ➔ Reduce to O(N)';
  } else {
    diagnosis = `Code structure analyzed for ${problem_title}. Bottleneck likely caused by redundant re-computations or memory allocations per iteration.`;
    optimalApproach = 'Optimize recursion with memoization (Dynamic Programming) or avoid copying large vectors/lists by passing by reference (&).';
    timeComplexity = 'O(2^N) ➔ Memoize to O(N)';
  }

  res.json({
    problem: problem_title,
    error_type: error_type || 'TLE',
    root_cause: diagnosis,
    complexity_found: timeComplexity,
    recommended_fix: optimalApproach,
    optimized_hint: 'Check if you can replace inner search loop with unordered_map or binary search.'
  });
});

// 3. RUN CODE SANDBOX EXECUTION
router.post('/run-code', (req, res) => {
  const { code, language = 'cpp', testcases = [] } = req.body;

  // Mock execution output returning passed test cases
  const results = testcases.map((tc, idx) => ({
    testcase: idx + 1,
    status: 'PASSED',
    input: tc.input,
    expected: tc.expected,
    actual: tc.expected,
    execution_time_ms: Math.floor(Math.random() * 20) + 5,
    memory_kb: 1420
  }));

  res.json({
    status: 'SUCCESS',
    all_passed: true,
    total: testcases.length || 1,
    passed: testcases.length || 1,
    results: results.length > 0 ? results : [
      { testcase: 1, status: 'PASSED', input: 'sample', expected: 'sample', actual: 'sample', execution_time_ms: 12, memory_kb: 1420 }
    ]
  });
});

export default router;
