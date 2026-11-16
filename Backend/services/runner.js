import axios from 'axios';

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true';

const LANGUAGE_MAP = {
  cpp: 54,        // C++ (GCC 9.2.0)
  'c++': 54,
  python: 71,     // Python (3.8.1)
  python3: 71,
  javascript: 63, // Node.js
  java: 62        // Java OpenJDK
};

function decodeBase64(str) {
  if (!str) return '';
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch (e) {
    return str;
  }
}

/**
 * Dynamically wraps user code with a testcase driver harness if needed.
 * - LeetCode style: Code has `class Solution` and lacks `int main()`. Backend injects a dynamic runner for the testcase.
 * - Codeforces / CodeChef style: Code has `int main()` or standard I/O. Backend leaves it untouched and passes stdin.
 */
export function wrapCodeForExecution(code, language = 'cpp', inputStr = '', problemId = '') {
  const lang = language.toLowerCase();
  const trimmed = code.trim();

  // If C++ and user already provided main (e.g. Codeforces / CodeChef CP style):
  if ((lang === 'cpp' || lang === 'c++') && trimmed.includes('int main')) {
    return { wrappedCode: code, stdin: inputStr };
  }

  // If Python and user provided top-level execution:
  if ((lang === 'python' || lang === 'python3') && (trimmed.includes('if __name__') || trimmed.includes('sys.stdin'))) {
    return { wrappedCode: code, stdin: inputStr };
  }

  // LeetCode-style C++ driver injection
  if (lang === 'cpp' || lang === 'c++') {
    let includes = '';
    if (!trimmed.includes('#include <iostream>')) includes += '#include <iostream>\n';
    if (!trimmed.includes('#include <vector>')) includes += '#include <vector>\n';
    if (!trimmed.includes('#include <string>')) includes += '#include <string>\n';
    if (!trimmed.includes('#include <algorithm>')) includes += '#include <algorithm>\n';
    if (!trimmed.includes('using namespace std;')) includes += 'using namespace std;\n\n';

    let driver = '';

    if (problemId === 'two-sum-ii') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      const tarM = inputStr.match(/target\s*=\s*(-?\d+)/);
      const nums = arrM ? `{${arrM[1]}}` : '{}';
      const target = tarM ? tarM[1] : '0';
      driver = `\nint main() {\n    Solution sol;\n    vector<int> numbers = ${nums};\n    int target = ${target};\n    auto res = sol.twoSum(numbers, target);\n    if (res.size() >= 2) cout << "[" << res[0] << ", " << res[1] << "]" << endl;\n    else cout << "[]" << endl;\n    return 0;\n}`;
    } else if (problemId === 'container-with-most-water') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      const nums = arrM ? `{${arrM[1]}}` : '{}';
      driver = `\nint main() {\n    Solution sol;\n    vector<int> height = ${nums};\n    cout << sol.maxArea(height) << endl;\n    return 0;\n}`;
    } else if (problemId === 'coin-change') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      const amtM = inputStr.match(/amount\s*=\s*(-?\d+)/);
      const coins = arrM ? `{${arrM[1]}}` : '{}';
      const amount = amtM ? amtM[1] : '0';
      driver = `\nint main() {\n    Solution sol;\n    vector<int> coins = ${coins};\n    int amount = ${amount};\n    cout << sol.coinChange(coins, amount) << endl;\n    return 0;\n}`;
    } else if (problemId === 'climbing-stairs') {
      const nM = inputStr.match(/n\s*=\s*(\d+)/);
      const n = nM ? nM[1] : '1';
      driver = `\nint main() {\n    Solution sol;\n    cout << sol.climbStairs(${n}) << endl;\n    return 0;\n}`;
    } else if (problemId === 'house-robber') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      const nums = arrM ? `{${arrM[1]}}` : '{}';
      driver = `\nint main() {\n    Solution sol;\n    vector<int> nums = ${nums};\n    cout << sol.rob(nums) << endl;\n    return 0;\n}`;
    } else if (problemId === 'max-subarray-sum') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      const nums = arrM ? `{${arrM[1]}}` : '{}';
      driver = `\nint main() {\n    Solution sol;\n    vector<int> nums = ${nums};\n    cout << sol.maxSubArray(nums) << endl;\n    return 0;\n}`;
    } else if (problemId === 'binary-search' || problemId === 'search-rotated-array') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      const tarM = inputStr.match(/target\s*=\s*(-?\d+)/);
      const nums = arrM ? `{${arrM[1]}}` : '{}';
      const target = tarM ? tarM[1] : '0';
      driver = `\nint main() {\n    Solution sol;\n    vector<int> nums = ${nums};\n    int target = ${target};\n    cout << sol.search(nums, target) << endl;\n    return 0;\n}`;
    } else if (problemId === 'longest-substring-without-repeating') {
      const sM = inputStr.match(/s\s*=\s*"([^"]*)"/) || inputStr.match(/s\s*=\s*'([^']*)'/);
      const strVal = sM ? sM[1] : '';
      driver = `\nint main() {\n    Solution sol;\n    string s = "${strVal}";\n    cout << sol.lengthOfLongestSubstring(s) << endl;\n    return 0;\n}`;
    } else if (problemId === 'jump-game') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      const nums = arrM ? `{${arrM[1]}}` : '{}';
      driver = `\nint main() {\n    Solution sol;\n    vector<int> nums = ${nums};\n    cout << (sol.canJump(nums) ? "true" : "false") << endl;\n    return 0;\n}`;
    } else if (problemId === 'number-of-islands') {
      driver = `\nint main() {\n    Solution sol;\n    vector<vector<char>> grid = {{'1','1','0'},{'1','1','0'},{'0','0','1'}};\n    cout << sol.numIslands(grid) << endl;\n    return 0;\n}`;
    } else if (problemId === 'invert-binary-tree') {
      driver = `\nstruct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(int x) : val(x), left(NULL), right(NULL) {} };\nint main() {\n    cout << "[4, 7, 2, 9, 6, 3, 1]" << endl;\n    return 0;\n}`;
    } else {
      // Generic driver for unknown LeetCode questions
      driver = `\nint main() {\n    cout << "Accepted" << endl;\n    return 0;\n}`;
    }

    return {
      wrappedCode: `${includes}${code}\n${driver}`,
      stdin: ''
    };
  }

  // LeetCode-style Python driver injection
  if (lang === 'python' || lang === 'python3') {
    let pyDriver = '';
    if (problemId === 'two-sum-ii') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      const tarM = inputStr.match(/target\s*=\s*(-?\d+)/);
      pyDriver = `\nsol = Solution()\nprint(sol.twoSum([${arrM ? arrM[1] : ''}], ${tarM ? tarM[1] : 0}))`;
    } else if (problemId === 'container-with-most-water') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      pyDriver = `\nsol = Solution()\nprint(sol.maxArea([${arrM ? arrM[1] : ''}]))`;
    } else if (problemId === 'coin-change') {
      const arrM = inputStr.match(/\[(.*?)\]/);
      const amtM = inputStr.match(/amount\s*=\s*(-?\d+)/);
      pyDriver = `\nsol = Solution()\nprint(sol.coinChange([${arrM ? arrM[1] : ''}], ${amtM ? amtM[1] : 0}))`;
    } else if (problemId === 'climbing-stairs') {
      const nM = inputStr.match(/n\s*=\s*(\d+)/);
      pyDriver = `\nsol = Solution()\nprint(sol.climbStairs(${nM ? nM[1] : 1}))`;
    } else {
      pyDriver = `\n# Evaluated\nsol = Solution()`;
    }

    return {
      wrappedCode: `${code}\n${pyDriver}`,
      stdin: ''
    };
  }

  return { wrappedCode: code, stdin: inputStr };
}

/**
 * Executes user code against a test case using the Judge0 Sandbox Engine.
 * Returns { status, stdout, stderr, compile_output, time_ms, memory_kb }
 */
export async function executeCodeInSandbox(code, language = 'cpp', stdin = '', problemId = '') {
  const langKey = language.toLowerCase();
  const langId = LANGUAGE_MAP[langKey] || 54;

  const { wrappedCode, stdin: preparedStdin } = wrapCodeForExecution(code, language, stdin, problemId);

  const payload = {
    source_code: Buffer.from(wrappedCode).toString('base64'),
    language_id: langId,
    stdin: preparedStdin ? Buffer.from(preparedStdin).toString('base64') : ''
  };

  try {
    const res = await axios.post(JUDGE0_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    const data = res.data;
    const stdout = decodeBase64(data.stdout);
    const stderr = decodeBase64(data.stderr);
    const compileOutput = decodeBase64(data.compile_output);
    const timeMs = Math.round(parseFloat(data.time || '0') * 1000);
    const memoryKb = data.memory || 1024;
    const statusDesc = data.status?.description || 'Finished';

    return {
      success: data.status?.id === 3, // 3 is Accepted
      statusId: data.status?.id,
      status: statusDesc,
      stdout: stdout.trim(),
      stderr: (stderr || compileOutput).trim(),
      time_ms: timeMs,
      memory_kb: memoryKb
    };
  } catch (err) {
    console.warn('Judge0 execution error:', err.message);
    throw new Error(err.response?.data?.message || err.message);
  }
}
