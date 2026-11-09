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
 * Executes user code against a test case using the Judge0 Sandbox Engine.
 * Returns { status, stdout, stderr, compile_output, time_ms, memory_kb }
 */
export async function executeCodeInSandbox(code, language = 'cpp', stdin = '') {
  const langKey = language.toLowerCase();
  const langId = LANGUAGE_MAP[langKey] || 54;

  const payload = {
    source_code: Buffer.from(code).toString('base64'),
    language_id: langId,
    stdin: stdin ? Buffer.from(stdin).toString('base64') : ''
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
