import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api/client';
import { CodeEditorWithSyntax } from '../../components/CodeEditorWithSyntax';
import { useAuthStore } from '../../store/authStore';
import './PracticePage.css';

const PracticePage = () => {
  const { problemId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal, logout } = useAuthStore();

  // Retrieve handles from URL query or localStorage
  const getStoredHandles = () => {
    let lc = searchParams.get('lc') || '';
    let cf = searchParams.get('cf') || '';
    let cc = searchParams.get('cc') || '';
    if (!lc && !cf && !cc) {
      try {
        const stored = JSON.parse(localStorage.getItem('algotrack_handles') || '{}');
        lc = stored.lc || '';
        cf = stored.cf || '';
        cc = stored.cc || '';
      } catch (e) {}
    }
    return { lc, cf, cc };
  };

  const [handles, setHandles] = useState(getStoredHandles());
  const activeHandle = handles.cf || handles.lc || handles.cc;

  // Profile and Contests links
  const profileQueryParams = new URLSearchParams();
  if (handles.lc) profileQueryParams.append('lc', handles.lc);
  if (handles.cf) profileQueryParams.append('cf', handles.cf);
  if (handles.cc) profileQueryParams.append('cc', handles.cc);
  const profileQueryString = profileQueryParams.toString();
  const profileUrl = profileQueryString ? `/profile?${profileQueryString}` : '/';
  const contestsUrl = profileQueryString ? `/contests?${profileQueryString}` : '/contests';

  const handleSmartBack = (e) => {
    if (e) e.preventDefault();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(profileUrl);
    }
  };

  // ── Primary Mode: 'new' (Unsolved Challenges) vs 'revision' (Solved Questions) ──
  const [mode, setMode] = useState('new');

  // ── Platform Filter: 'all', 'leetcode', 'codeforces', 'codechef' ──
  const [platform, setPlatform] = useState('all');

  // ── Difficulty Filter: 'All', 'Easy', 'Medium', 'Hard' ──
  const [difficulty, setDifficulty] = useState('All');

  // ── Topic Filter ──
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [page, setPage] = useState(1);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);

  // Locally dismissed / marked solved IDs
  const getDismissedIds = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem('algotrack_dismissed_solved') || '[]'));
    } catch (e) {
      return new Set();
    }
  };
  const [dismissedSet, setDismissedSet] = useState(getDismissedIds());

  const [problems, setProblems] = useState([]);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  
  // Left pane tab ('desc', 'hints', 'solution')
  const [leftTab, setLeftTab] = useState('desc');
  // Bottom console tab ('testcases', 'output', 'ai')
  const [consoleTab, setConsoleTab] = useState('testcases');
  
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [activeHintIndex, setActiveHintIndex] = useState(0);
  const [testResult, setTestResult] = useState(null);
  const [activeCase, setActiveCase] = useState(0);

  const TOPICS = [
    'All',
    'Arrays & Hashing',
    'Two Pointers',
    'Dynamic Programming',
    'Binary Search',
    'Graphs & Trees',
    'Greedy & Math',
    'Strings'
  ];

  // ── Dynamic Multi-Platform Problem Loader ──
  const loadProblems = async (isNewBatch = false) => {
    try {
      setIsLoadingProblems(true);
      const targetPage = isNewBatch ? page + 1 : page;
      if (isNewBatch) setPage(targetPage);

      const params = new URLSearchParams();
      params.append('mode', mode);
      if (platform !== 'all') params.append('platform', platform);
      if (difficulty !== 'All') params.append('difficulty', difficulty);
      if (selectedTopic !== 'All') params.append('topic', selectedTopic);
      if (handles.lc) params.append('leetcode', handles.lc);
      if (handles.cf) params.append('codeforces', handles.cf);
      if (handles.cc) params.append('codechef', handles.cc);
      if (isNewBatch) params.append('shuffle', 'true');
      params.append('page', targetPage.toString());
      params.append('limit', '30');

      const resp = await api.get(`/practice-problems?${params.toString()}`);
      
      // Update solved state based on local marks
      const marked = (resp.data || []).map(p => ({
        ...p,
        is_solved: p.is_solved || dismissedSet.has(p.id) || dismissedSet.has(p.title.toLowerCase())
      }));

      // Filter according to active mode
      const filtered = mode === 'revision' 
        ? marked.filter(p => p.is_solved)
        : marked.filter(p => !p.is_solved);

      // If in revision mode and filtered list is empty, display all marked questions
      const displayList = (mode === 'revision' && filtered.length === 0) ? marked : filtered;
      setProblems(displayList);

      if (displayList.length > 0) {
        const matched = problemId 
          ? displayList.find(p => p.id === problemId) || displayList[0]
          : displayList[0];
        setCurrentProblem(matched);
        setCode(matched.starter_code?.[language] || matched.starter_code?.cpp || '');
        if (mode === 'revision') setLeftTab('solution');
      } else {
        setCurrentProblem(null);
      }
    } catch (err) {
      console.error("Failed to load practice problems", err);
    } finally {
      setIsLoadingProblems(false);
    }
  };

  useEffect(() => {
    loadProblems(false);
  }, [mode, platform, difficulty, selectedTopic, handles.cf, handles.lc, handles.cc, dismissedSet]);

  // Handle problem selection
  const handleProblemSelect = (id) => {
    const selected = problems.find(p => p.id === id);
    if (selected) {
      setCurrentProblem(selected);
      setCode(selected.starter_code?.[language] || selected.starter_code?.cpp || '');
      setDiagnosis(null);
      setTestResult(null);
      setActiveHintIndex(0);
      setConsoleTab('testcases');
      setLeftTab(mode === 'revision' ? 'solution' : 'desc');
    }
  };

  // Mark current problem as Solved (moves to Revision)
  const handleMarkAsAlreadyDone = () => {
    if (!currentProblem) return;
    const newDismissed = new Set(dismissedSet);
    newDismissed.add(currentProblem.id);
    newDismissed.add(currentProblem.title.toLowerCase());
    setDismissedSet(newDismissed);
    try {
      localStorage.setItem('algotrack_dismissed_solved', JSON.stringify(Array.from(newDismissed)));
    } catch (e) {}

    // Next remaining problem
    const remaining = problems.filter(p => p.id !== currentProblem.id && !newDismissed.has(p.id));
    if (remaining.length > 0) {
      handleProblemSelect(remaining[0].id);
    } else {
      loadProblems(true);
    }
  };

  // Handle language switch
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (currentProblem && currentProblem.starter_code && currentProblem.starter_code[newLang]) {
      setCode(currentProblem.starter_code[newLang]);
    }
  };

  // Reset starter template
  const handleResetCode = () => {
    if (currentProblem && currentProblem.starter_code) {
      setCode(currentProblem.starter_code[language] || currentProblem.starter_code.cpp || '');
      setTestResult(null);
    }
  };

  // Run AI Diagnostics
  const handleDiagnose = async () => {
    if (!code.trim() || !currentProblem) return;
    try {
      setIsDiagnosing(true);
      setConsoleTab('ai');
      const resp = await api.post('/diagnose', {
        code,
        language,
        problem_title: currentProblem.title,
        constraints: currentProblem.constraints,
        error_type: 'TLE'
      });
      setDiagnosis(resp.data);
    } catch (err) {
      console.error(err);
      alert("Failed to run AI diagnostics. Please ensure backend is running.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Real Code Execution with Backend Engine
  const handleRunCode = async () => {
    if (!code || !code.trim()) {
      alert("Please write your code before running.");
      return;
    }
    setConsoleTab('output');
    setIsRunningCode(true);
    setTestResult({
      status: "Running...",
      runtime: "...",
      memory: "...",
      testCasesPassed: "Executing code...",
      stdout: "Compiling and executing your code against test cases..."
    });

    try {
      const cases = currentProblem?.testcases || [
        { input: currentProblem?.sample_input || "", expected: currentProblem?.sample_output || "" }
      ];

      const resp = await api.post('/run-code', {
        code,
        language,
        testcases: cases
      });

      const res = resp.data;
      const isAccepted = res.status === "Accepted" || res.status === "Finished" || res.status === "Passed" || res.status === "SUCCESS";
      
      const stdoutText = res.stdout || res.results?.[0]?.actual || res.output || '';
      const stderrText = res.stderr || res.compile_output || '';
      const memoryText = res.memory_kb ? `${(res.memory_kb / 1024).toFixed(1)} MB` : (res.results?.[0]?.memory_kb ? `${(res.results[0].memory_kb / 1024).toFixed(1)} MB` : "1.4 MB");
      const runtimeMs = res.runtime_ms ?? res.results?.[0]?.execution_time_ms ?? 0;
      const passedCount = res.passed_count ?? res.passed ?? (isAccepted ? (cases.length || 1) : 0);
      const totalCount = res.total_count ?? res.total ?? cases.length;

      let displayText = stdoutText;
      if (stderrText) {
        displayText = displayText ? `${displayText}\n\n[Compiler / Runtime Errors]:\n${stderrText}` : `[Compiler Error / Diagnostics]:\n${stderrText}`;
      }
      if (!displayText) {
        displayText = isAccepted ? "Program executed successfully with no stdout." : "No output produced. Check your return statement or test cases.";
      }

      setTestResult({
        status: res.status || (isAccepted ? "Accepted" : "Wrong Answer"),
        runtime: `${runtimeMs} ms`,
        memory: memoryText,
        testCasesPassed: `${passedCount} / ${totalCount} Passed`,
        stdout: displayText,
        isError: !isAccepted || !!stderrText
      });
    } catch (err) {
      console.error(err);
      setTestResult({
        status: "Execution Failed",
        runtime: "0 ms",
        memory: "0 MB",
        testCasesPassed: "0 / 0 Passed",
        stdout: `Backend server error: ${err.response?.data?.detail || err.message}\nMake sure backend is running on port 8000.`,
        isError: true
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  const testcases = currentProblem?.testcases || [
    { input: currentProblem?.sample_input || "Sample", expected: currentProblem?.sample_output || "Expected" }
  ];

  return (
    <div className="arena-container">
      {/* ── Top Navigation Bar ── */}
      <nav className="arena-nav">
        <div className="arena-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSmartBack}
            className="back-link"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#38bdf8',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            ← Back to Profile {activeHandle ? `(@${activeHandle})` : ''}
          </button>
          <span style={{ color: '#52525b' }}>|</span>

          {/* Primary Mode Tabs: New Questions vs Revision */}
          <div style={{ display: 'inline-flex', background: '#18181b', borderRadius: '8px', padding: '3px', border: '1px solid #27272a' }}>
            <button
              onClick={() => { setMode('new'); setLeftTab('desc'); }}
              style={{
                background: mode === 'new' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                color: mode === 'new' ? '#fff' : '#a1a1aa',
                border: 'none',
                padding: '5px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              ⚡ New Challenges
            </button>
            <button
              onClick={() => { setMode('revision'); setLeftTab('solution'); }}
              style={{
                background: mode === 'revision' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: mode === 'revision' ? '#fff' : '#a1a1aa',
                border: 'none',
                padding: '5px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              📖 Revision Arena
            </button>
          </div>

          <span style={{ color: '#52525b' }}>/</span>

          {/* Clean Problem Selector */}
          {problems.length > 0 && currentProblem && (
            <select 
              className="problem-dropdown"
              value={currentProblem.id}
              onChange={(e) => handleProblemSelect(e.target.value)}
              style={{ maxWidth: '340px' }}
            >
              {problems.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.platform || 'LeetCode'}] {p.title} • {p.difficulty}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Controls */}
        <div className="arena-nav-actions">
          {isAuthenticated && user?.college && (
            <span style={{ 
              background: 'rgba(168, 85, 247, 0.2)', 
              color: '#c084fc', 
              border: '1px solid rgba(168, 85, 247, 0.4)', 
              borderRadius: '20px', 
              padding: '3px 8px', 
              fontSize: '0.75rem', 
              fontWeight: 700 
            }}>
              🏛️ {user.college}
            </span>
          )}

          <Link
            to={contestsUrl}
            style={{ color: '#cbd5e1', fontSize: '0.82rem', textDecoration: 'none', padding: '5px 10px', background: '#1f1f23', borderRadius: '6px' }}
          >
            🏆 Contests
          </Link>

          <select 
            className="lang-select"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="cpp">C++ 20</option>
            <option value="python">Python 3</option>
          </select>

          <button 
            className="btn-console-run" 
            onClick={handleRunCode}
            disabled={isRunningCode}
          >
            {isRunningCode ? "⏳ Running..." : "▶ Run Test Cases"}
          </button>

          <button 
            className="btn-console-ai" 
            onClick={handleDiagnose}
            disabled={isDiagnosing}
          >
            {isDiagnosing ? "Analyzing..." : "⚡ AI: Why TLE / MLE?"}
          </button>

          {isAuthenticated ? (
            <button
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              title="Sign Out"
            >
              Log Out
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid #3b82f6',
                color: '#60a5fa',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* ── Streamlined Filter Strip: Platform + Difficulty + Topics ── */}
      <div style={{ display: 'flex', gap: '10px', padding: '8px 20px', background: '#0e0e12', borderBottom: '1px solid #1f1f23', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* 1. Platform Tabs */}
        <div style={{ display: 'inline-flex', background: '#18181b', borderRadius: '6px', padding: '2px', border: '1px solid #27272a' }}>
          <button
            onClick={() => setPlatform('all')}
            style={{
              background: platform === 'all' ? '#3b82f6' : 'transparent',
              color: platform === 'all' ? '#fff' : '#a1a1aa',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            All Platforms
          </button>
          <button
            onClick={() => setPlatform('leetcode')}
            style={{
              background: platform === 'leetcode' ? '#fbbf24' : 'transparent',
              color: platform === 'leetcode' ? '#000' : '#a1a1aa',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🟧 LeetCode
          </button>
          <button
            onClick={() => setPlatform('codeforces')}
            style={{
              background: platform === 'codeforces' ? '#60a5fa' : 'transparent',
              color: platform === 'codeforces' ? '#000' : '#a1a1aa',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🟦 Codeforces
          </button>
          <button
            onClick={() => setPlatform('codechef')}
            style={{
              background: platform === 'codechef' ? '#c084fc' : 'transparent',
              color: platform === 'codechef' ? '#000' : '#a1a1aa',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🟫 CodeChef
          </button>
        </div>

        <span style={{ color: '#334155' }}>|</span>

        {/* 2. Difficulty Tabs */}
        <div style={{ display: 'inline-flex', background: '#18181b', borderRadius: '6px', padding: '2px', border: '1px solid #27272a' }}>
          {['All', 'Easy', 'Medium', 'Hard'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setDifficulty(lvl)}
              style={{
                background: difficulty === lvl ? '#334155' : 'transparent',
                color: difficulty === lvl 
                  ? (lvl === 'Easy' ? '#34d399' : (lvl === 'Hard' ? '#f87171' : (lvl === 'Medium' ? '#fbbf24' : '#fff')))
                  : '#a1a1aa',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {lvl === 'All' ? 'All Levels' : lvl}
            </button>
          ))}
        </div>

        <span style={{ color: '#334155' }}>|</span>

        {/* 3. Topic Selector */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', alignItems: 'center' }}>
          {TOPICS.slice(0, 5).map(topic => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              style={{
                background: selectedTopic === topic ? '#3b82f6' : '#18181b',
                color: selectedTopic === topic ? '#fff' : '#a1a1aa',
                border: '1px solid',
                borderColor: selectedTopic === topic ? '#60a5fa' : '#27272a',
                borderRadius: '14px',
                padding: '2px 10px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Right side controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {mode === 'new' && (
            <>
              <button
                onClick={() => loadProblems(true)}
                disabled={isLoadingProblems}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '16px',
                  padding: '3px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Shuffle and pull fresh questions"
              >
                🔄 {isLoadingProblems ? 'Loading...' : 'New Batch'}
              </button>
              <button
                onClick={handleMarkAsAlreadyDone}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '16px',
                  padding: '3px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Mark solved and send to Revision Arena"
              >
                ✓ Mark Solved
              </button>
            </>
          )}

          {mode === 'revision' && (
            <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
              📖 Revision Mode: {problems.length} Solved Questions Ready
            </span>
          )}
        </div>
      </div>

      {/* ── Main Workspace Split ── */}
      {!currentProblem ? (
        <div className="arena-container flex-center" style={{ flexDirection: 'column', gap: '16px', minHeight: '80vh', textAlign: 'center', padding: '20px' }}>
          <h3 style={{ color: '#f8fafc' }}>
            {mode === 'revision' ? "No solved questions in this filter." : "No unsolved questions found in this filter."}
          </h3>
          <p style={{ color: '#94a3b8', maxWidth: '480px', fontSize: '0.9rem' }}>
            {mode === 'revision' 
              ? "You haven't marked any questions as solved under this specific platform/difficulty yet. Switch to 'New Challenges' to solve questions, or reset your filters."
              : "Try switching difficulty or platform to explore more problems!"}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-console-run" onClick={() => { setDifficulty('All'); setPlatform('all'); setSelectedTopic('All'); }}>
              Reset Filters
            </button>
            <button className="btn-console-ai" onClick={() => loadProblems(true)}>
              🔄 Load Fresh Problems
            </button>
          </div>
        </div>
      ) : (
        <div className="arena-main">
          {/* Left Pane: Full In-App Problem Statement, Examples, Constraints, Solutions */}
          <div className="arena-left-pane">
            <div className="pane-tab-header">
              <button 
                className={`pane-tab-btn ${leftTab === 'desc' ? 'active' : ''}`}
                onClick={() => setLeftTab('desc')}
              >
                📄 Problem Statement
              </button>
              <button 
                className={`pane-tab-btn ${leftTab === 'hints' ? 'active' : ''}`}
                onClick={() => setLeftTab('hints')}
              >
                💡 Hints & Clues
              </button>
              <button 
                className={`pane-tab-btn ${leftTab === 'solution' ? 'active' : ''}`}
                onClick={() => setLeftTab('solution')}
                style={{ color: leftTab === 'solution' ? '#34d399' : '#a1a1aa' }}
              >
                👁️ Reference Solution
              </button>
            </div>

            <div className="pane-content" style={{ overflowY: 'auto', padding: '20px' }}>
              {/* Tab 1: Full Problem Statement */}
              {leftTab === 'desc' && (
                <>
                  <div className="problem-headline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700 }}>
                      {currentProblem.title}
                    </h2>
                    {currentProblem.url && (
                      <a 
                        href={currentProblem.url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '0.78rem', color: '#38bdf8', textDecoration: 'none', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '3px 8px', borderRadius: '4px' }}
                      >
                        Official Site ↗
                      </a>
                    )}
                  </div>

                  <div className="problem-pills" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {/* Platform Badge */}
                    <span style={{
                      background: (currentProblem.platform === 'Codeforces') ? 'rgba(59, 130, 246, 0.2)' : ((currentProblem.platform === 'CodeChef') ? 'rgba(192, 132, 252, 0.2)' : 'rgba(251, 191, 36, 0.2)'),
                      color: (currentProblem.platform === 'Codeforces') ? '#60a5fa' : ((currentProblem.platform === 'CodeChef') ? '#c084fc' : '#fbbf24'),
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {currentProblem.platform || 'LeetCode'}
                    </span>

                    {/* Difficulty Badge */}
                    <span className={`pill-difficulty ${currentProblem.difficulty.toLowerCase().includes('easy') ? 'easy' : (currentProblem.difficulty.toLowerCase().includes('hard') ? 'hard' : 'medium')}`}>
                      {currentProblem.difficulty}
                    </span>

                    <span className="pill-tag">{currentProblem.topic}</span>
                    <span className="pill-tag">⏱️ {currentProblem.time_limit || '1.0s'}</span>
                    <span className="pill-tag">💾 {currentProblem.memory_limit || '256MB'}</span>

                    {/* Status Pill */}
                    {currentProblem.is_solved ? (
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        Solved / In Revision
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                        Unsolved Challenge
                      </span>
                    )}
                  </div>

                  {/* Complete In-App Description */}
                  <div style={{ color: '#d4d4d8', fontSize: '0.94rem', lineHeight: '1.7', whiteSpace: 'pre-line', marginBottom: '20px' }}>
                    {currentProblem.description}
                  </div>

                  {/* Input Format */}
                  {currentProblem.input_format && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className="section-label" style={{ color: '#38bdf8', fontWeight: 600, marginBottom: '6px' }}>Input Format:</div>
                      <div className="code-box" style={{ background: '#121216', color: '#cbd5e1', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
                        {currentProblem.input_format}
                      </div>
                    </div>
                  )}

                  {/* Output Format */}
                  {currentProblem.output_format && (
                    <div style={{ marginBottom: '20px' }}>
                      <div className="section-label" style={{ color: '#38bdf8', fontWeight: 600, marginBottom: '6px' }}>Output Format:</div>
                      <div className="code-box" style={{ background: '#121216', color: '#cbd5e1', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
                        {currentProblem.output_format}
                      </div>
                    </div>
                  )}

                  {/* In-Depth Examples with Explanations */}
                  {currentProblem.examples && currentProblem.examples.length > 0 ? (
                    <div style={{ marginBottom: '20px' }}>
                      <div className="section-label" style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem', marginBottom: '10px' }}>
                        Examples & Explanations:
                      </div>
                      {currentProblem.examples.map((ex, i) => (
                        <div key={i} style={{ background: '#121216', border: '1px solid #27272a', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                          <div style={{ color: '#a1a1aa', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>Example {i + 1}:</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '0.86rem' }}>
                            <div>
                              <strong style={{ color: '#94a3b8' }}>Input: </strong>
                              <code style={{ color: '#f1f5f9', background: '#1f1f23', padding: '2px 6px', borderRadius: '4px' }}>{ex.input}</code>
                            </div>
                            <div>
                              <strong style={{ color: '#94a3b8' }}>Output: </strong>
                              <code style={{ color: '#34d399', background: '#1f1f23', padding: '2px 6px', borderRadius: '4px' }}>{ex.output}</code>
                            </div>
                            {ex.explanation && (
                              <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '4px', borderLeft: '2px solid #3b82f6', paddingLeft: '8px' }}>
                                <strong>Explanation: </strong>{ex.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="section-label">Sample Input:</div>
                      <div className="code-box">{currentProblem.sample_input}</div>
                      <div className="section-label">Sample Output:</div>
                      <div className="code-box">{currentProblem.sample_output}</div>
                    </>
                  )}

                  {/* Constraints */}
                  <div className="section-label" style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '6px' }}>Constraints:</div>
                  <div className="code-box" style={{ color: '#fbbf24', background: '#18181b', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', whiteSpace: 'pre-line' }}>
                    {currentProblem.constraints || "Standard time and memory limits apply."}
                  </div>
                </>
              )}

              {/* Tab 2: Hints & Clues */}
              {leftTab === 'hints' && (
                <div>
                  <h3 style={{ color: '#f8fafc', marginBottom: '14px' }}>Progressive Hints & Intuition</h3>
                  {currentProblem.hints && currentProblem.hints.length > 0 ? (
                    currentProblem.hints.map((hint, idx) => (
                      <div 
                        key={idx}
                        style={{
                          background: idx <= activeHintIndex ? '#18181b' : 'rgba(24, 24, 27, 0.4)',
                          border: '1px solid',
                          borderColor: idx <= activeHintIndex ? '#3b82f6' : '#27272a',
                          borderRadius: '8px',
                          padding: '14px',
                          marginBottom: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.85rem' }}>Hint {idx + 1}</span>
                          {idx > activeHintIndex && (
                            <button 
                              className="btn-console-run"
                              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                              onClick={() => setActiveHintIndex(idx)}
                            >
                              Unlock Hint
                            </button>
                          )}
                        </div>
                        {idx <= activeHintIndex ? (
                          <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.6' }}>{hint}</p>
                        ) : (
                          <p style={{ margin: 0, color: '#52525b', fontSize: '0.85rem', fontStyle: 'italic' }}>Hint locked. Click to reveal when stuck.</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#a1a1aa' }}>Analyze the constraints carefully to deduce whether a greedy or dynamic programming transition is required.</p>
                  )}
                </div>
              )}

              {/* Tab 3: Reference Solution (Always accessible, perfect for Revision!) */}
              {leftTab === 'solution' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ color: '#34d399', margin: 0 }}>Optimal Reference Solution ({language.toUpperCase()})</h3>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                      Revision Verified
                    </span>
                  </div>
                  <div className="code-box" style={{ background: '#09090b', color: '#a7f3d0', fontSize: '0.86rem', padding: '16px', borderRadius: '8px', overflowX: 'auto' }}>
                    <pre style={{ margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {currentProblem.solution_code?.[language] || currentProblem.solution_code?.cpp || "Optimal solution available for this pattern."}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Bug-Free Syntax Code Editor & Console Drawer */}
          <div className="arena-right-pane">
            <div className="editor-header-bar">
              <div className="editor-filename-tab">
                <span>Solution.{language === 'cpp' ? 'cpp' : 'py'}</span>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  {mode === 'revision' ? 'Revision Workspace' : 'Unsolved Template'}
                </span>
              </div>
              
              <button 
                onClick={handleResetCode}
                style={{ background: 'transparent', border: 'none', color: '#71717a', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Reset Starter Template"
              >
                ↺ Reset Template
              </button>
            </div>

            {/* Syntax-Aware Code Editor (Single-pass lexer, zero "token" leaks) */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <CodeEditorWithSyntax
                code={code}
                setCode={setCode}
                language={language}
              />
            </div>

            {/* Bottom Console Drawer */}
            <div className="arena-console">
              <div className="console-tab-bar">
                <div className="console-tabs">
                  <button 
                    className={`console-tab ${consoleTab === 'testcases' ? 'active' : ''}`}
                    onClick={() => setConsoleTab('testcases')}
                  >
                    🧪 Testcases ({testcases.length})
                  </button>
                  <button 
                    className={`console-tab ${consoleTab === 'output' ? 'active' : ''}`}
                    onClick={() => setConsoleTab('output')}
                  >
                    🖥️ Output {testResult ? "•" : ""}
                  </button>
                  <button 
                    className={`console-tab ${consoleTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setConsoleTab('ai')}
                    style={{ color: '#c084fc' }}
                  >
                    ⚡ AI Diagnostics {diagnosis ? "•" : ""}
                  </button>
                </div>

                <div className="console-actions">
                  <button className="btn-console-run" onClick={handleRunCode} disabled={isRunningCode}>
                    {isRunningCode ? "⏳ Running..." : "▶ Run"}
                  </button>
                  <button className="btn-console-ai" onClick={handleDiagnose} disabled={isDiagnosing}>
                    {isDiagnosing ? "Analyzing..." : "⚡ AI Diagnostics"}
                  </button>
                </div>
              </div>

              <div className="console-body">
                {/* 1. Testcases Tab */}
                {consoleTab === 'testcases' && (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      {testcases.map((_, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setActiveCase(idx)}
                          className="btn-console-run" 
                          style={{ background: activeCase === idx ? '#3b82f6' : '#1f1f23', color: '#fff' }}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                    </div>

                    <div className="code-box" style={{ margin: 0 }}>
                      <div style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '4px' }}>Input:</div>
                      <div>{testcases[activeCase]?.input || currentProblem.sample_input}</div>
                      
                      <div style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: '10px', marginBottom: '4px' }}>Expected Output:</div>
                      <div style={{ color: '#34d399' }}>{testcases[activeCase]?.expected || currentProblem.sample_output}</div>
                    </div>
                  </div>
                )}

                {/* 2. Run Output Tab */}
                {consoleTab === 'output' && (
                  <div>
                    {testResult ? (
                      <div>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{
                            background: (testResult.status === 'Accepted' || testResult.status === 'Finished' || testResult.status === 'Passed')
                              ? 'rgba(16, 185, 129, 0.2)' 
                              : (testResult.status === 'Running...' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                            color: (testResult.status === 'Accepted' || testResult.status === 'Finished' || testResult.status === 'Passed')
                              ? '#34d399' 
                              : (testResult.status === 'Running...' ? '#38bdf8' : '#f87171'),
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                          }}>
                            {testResult.status === 'Accepted' ? '✅ Accepted' : (testResult.status === 'Running...' ? '⏳ Running...' : `⚠️ ${testResult.status}`)}
                          </span>
                          <span style={{ color: '#a1a1aa', fontSize: '0.82rem' }}>Runtime: {testResult.runtime}</span>
                          <span style={{ color: '#a1a1aa', fontSize: '0.82rem' }}>Memory: {testResult.memory}</span>
                          <span style={{ color: '#38bdf8', fontSize: '0.82rem' }}>{testResult.testCasesPassed}</span>
                        </div>
                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85rem', color: '#e4e4e7', background: '#09090b', padding: '12px', borderRadius: '6px' }}>
                          {testResult.stdout}
                        </pre>
                      </div>
                    ) : (
                      <p style={{ color: '#71717a', margin: 0 }}>Click "Run Test Cases" above to compile and execute testcases.</p>
                    )}
                  </div>
                )}

                {/* 3. AI Diagnostics Tab */}
                {consoleTab === 'ai' && (
                  <div>
                    {diagnosis ? (
                      <div className="ai-report-grid">
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span className="complexity-badge time">Time: {diagnosis.estimated_time_complexity}</span>
                          <span className="complexity-badge space">Space: {diagnosis.estimated_space_complexity}</span>
                        </div>

                        <div className="ai-card danger">
                          <div className="ai-card-title" style={{ color: '#f87171' }}>
                            ⚠️ Asymptotic Complexity Risk:
                          </div>
                          <p style={{ margin: 0, color: '#e4e4e7', fontSize: '0.88rem' }}>
                            {diagnosis.complexity_verdict}
                          </p>
                        </div>

                        {diagnosis.why_tle && (
                          <div className="ai-card">
                            <div className="ai-card-title" style={{ color: '#fbbf24' }}>
                              ⏱️ Root-Cause: Why does this risk TLE?
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.88rem' }}>
                              {diagnosis.why_tle.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}

                        {diagnosis.better_approach && (
                          <div className="ai-card success">
                            <div className="ai-card-title" style={{ color: '#34d399' }}>
                              💡 Optimal Alternative: {diagnosis.better_approach.title}
                            </div>
                            <p style={{ margin: '4px 0 8px', color: '#e2e8f0', fontSize: '0.88rem' }}>
                              {diagnosis.better_approach.why_better}
                            </p>
                            <div style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 'bold' }}>
                              Expected Speedup: {diagnosis.better_approach.complexity_jump}
                            </div>
                            {diagnosis.better_approach.action_items && (
                              <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: '#94a3b8', fontSize: '0.84rem' }}>
                                {diagnosis.better_approach.action_items.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#a1a1aa' }}>
                        <p style={{ margin: '0 0 10px' }}>
                          Click <strong>"⚡ AI: Why TLE / MLE?"</strong> to run an algorithmic complexity diagnostic on your code.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticePage;
