import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  getDSASession, startDSASession, submitDSACode, runDSACode,
  runDSACustom, getDSASubmissions, endDSASession, reportDSAProctorEvent,
} from '../../api';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Play, Send, Clock, CheckCircle, XCircle, Code2,
  FileText, ChevronUp, ChevronDown, Terminal, History,
  Timer, RotateCcw, EyeOff, Maximize2, Minimize2,
} from 'lucide-react';
import '../../styles/dsa.css';

const STATUS_CONFIG = {
  accepted:      { label: 'Accepted',       color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  wrong_answer:  { label: 'Wrong Answer',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  time_limit:    { label: 'Time Limit Exceeded', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  runtime_error: { label: 'Runtime Error',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  compile_error: { label: 'Compilation Error', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  error:         { label: 'Error',          color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export default function DSATest() {
  const { sessionId } = useParams();

  // Core state
  const [session, setSession] = useState(null);
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // Left panel tabs: description | submissions
  const [leftTab, setLeftTab] = useState('description');

  // Bottom console tabs: testcase | result | custom
  const [consoleTab, setConsoleTab] = useState('testcase');
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [consoleHeight, setConsoleHeight] = useState(280);

  // Test case navigation
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [customOutput, setCustomOutput] = useState(null);

  // Execution state
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Submissions history
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [tabViolations, setTabViolations] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const timerRef = useRef(null);

  // Editor
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  // Resizer
  const resizerRef = useRef(null);
  const consoleRef = useRef(null);

  // ── Load session ──
  useEffect(() => {
    (async () => {
      try {
        const res = await getDSASession(sessionId);
        const data = res.data;
        setSession(data);
        setProblem(data.problem);
        if (data.problem?.starter_code?.python) {
          setCode(data.problem.starter_code.python);
        }
        if (data.status === 'completed') {
          // Session already completed — show as expired
          setSessionStarted(true);
          setTimeLeft(0);
        } else if (data.status === 'active') {
          setSessionStarted(true);
          const remaining = calcRemaining(data);
          setTimeLeft(remaining);
          if (remaining <= 0) {
            // Time expired while user was away — close session server-side
            endDSASession(sessionId).catch(() => {});
          }
        }
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to load session');
      }
    })();
  }, [sessionId]);

  // Ensure datetime strings without timezone are treated as UTC
  const parseUTC = (s) => {
    if (!s) return NaN;
    // If no timezone indicator, append Z to treat as UTC
    if (!s.endsWith('Z') && !s.includes('+') && !/\d{2}-\d{2}:\d{2}$/.test(s)) {
      return new Date(s + 'Z').getTime();
    }
    return new Date(s).getTime();
  };

  const calcRemaining = (data) => {
    const limit = (data?.time_limit_minutes || 45) * 60 * 1000;
    const startedStr = data?.started_at || data?.created_at;
    if (!startedStr) return Math.floor(limit / 1000);
    const started = parseUTC(startedStr);
    if (isNaN(started)) return Math.floor(limit / 1000);
    return Math.max(0, Math.floor((limit - (Date.now() - started)) / 1000));
  };

  const initTimer = (data) => {
    const limit = (data?.time_limit_minutes || 45) * 60 * 1000;
    const startedStr = data?.started_at || data?.created_at;
    if (!startedStr) {
      setTimeLeft(Math.floor(limit / 1000));
      return;
    }
    const started = parseUTC(startedStr);
    if (isNaN(started)) {
      setTimeLeft(Math.floor(limit / 1000));
      return;
    }
    const remaining = Math.max(0, limit - (Date.now() - started));
    setTimeLeft(Math.floor(remaining / 1000));
  };

  // ── Countdown ──
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft !== null]);

  const handleTimeUp = async () => {
    try { await endDSASession(sessionId); } catch (_) { /* ignore */ }
  };

  const formatTime = (seconds) => {
    if (seconds == null) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Start session ──
  const handleStart = async () => {
    try {
      await startDSASession(sessionId);
      setSessionStarted(true);
      const refreshed = await getDSASession(sessionId);
      setSession(refreshed.data);
      initTimer(refreshed.data);
    } catch (_) {
      setSessionStarted(true);
      const refreshed = await getDSASession(sessionId);
      setSession(refreshed.data);
      initTimer(refreshed.data);
    }
  };

  // ── Run visible tests ──
  const handleRun = useCallback(async () => {
    setRunning(true);
    setTestResults([]);
    setSubmissionResult(null);
    setConsoleTab('result');
    setConsoleOpen(true);
    try {
      const res = await runDSACode(sessionId, { language: 'python', source_code: code });
      setTestResults(res.data.test_results || []);
    } catch (err) {
      setTestResults([{
        passed: false, status: 'error',
        stderr: err.response?.data?.detail || 'Execution failed',
        input: '', expected: '', actual: '',
      }]);
    }
    setRunning(false);
  }, [sessionId, code]);

  // ── Run custom input ──
  const handleRunCustom = async () => {
    setRunning(true);
    setCustomOutput(null);
    setConsoleTab('custom');
    setConsoleOpen(true);
    try {
      const res = await runDSACustom(sessionId, {
        source_code: code,
        custom_input: customInput,
      });
      setCustomOutput(res.data);
    } catch (err) {
      setCustomOutput({
        stdout: '',
        stderr: err.response?.data?.detail || 'Execution failed',
        error: true,
      });
    }
    setRunning(false);
  };

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmissionResult(null);
    setConsoleTab('result');
    setConsoleOpen(true);
    try {
      const res = await submitDSACode(sessionId, { language: 'python', source_code: code });
      setSubmissionResult(res.data);
      setTestResults(res.data.test_results || []);
      loadSubmissions();
      const s = await getDSASession(sessionId);
      setSession(s.data);
    } catch (err) {
      setSubmissionResult({
        status: 'error', score: 0,
        message: err.response?.data?.detail || 'Submission failed',
      });
    }
    setSubmitting(false);
  }, [sessionId, code]);

  // ── Load submissions ──
  const loadSubmissions = async () => {
    try {
      const res = await getDSASubmissions(sessionId);
      setSubmissions(res.data || []);
    } catch (_) { /* ignore */ }
  };

  useEffect(() => {
    if (leftTab === 'submissions') loadSubmissions();
  }, [leftTab]);

  // ── Console resizer drag ──
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = consoleHeight;
    const onMove = (ev) => {
      const delta = startY - ev.clientY;
      setConsoleHeight(Math.max(100, Math.min(600, startH + delta)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [consoleHeight]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault();
        handleRun();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRun, handleSubmit]);

  // ── Tab/Visibility change proctoring ──
  useEffect(() => {
    if (!sessionStarted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setTabViolations(prev => prev + 1);
        setShowTabWarning(true);
        setTimeout(() => setShowTabWarning(false), 5000);
        reportDSAProctorEvent(sessionId, { event_type: 'tab_switch' }).catch(() => {});
      }
    };
    const handleBlur = () => {
      setTabViolations(prev => prev + 1);
      setShowTabWarning(true);
      setTimeout(() => setShowTabWarning(false), 5000);
      reportDSAProctorEvent(sessionId, { event_type: 'window_blur' }).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [sessionStarted, sessionId]);

  // ── Error screen ──
  if (error) {
    return (
      <div className="dsa-error-screen">
        <div className="dsa-error-card">
          <XCircle size={48} className="text-danger mb-3" />
          <h4>{error}</h4>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Please check the link or contact your recruiter.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (!problem) {
    return (
      <div className="dsa-loading-screen">
        <div className="dsa-loader" />
        <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Loading challenge...</p>
      </div>
    );
  }

  // ── Pre-start screen ──
  if (!sessionStarted && session?.status === 'waiting') {
    return (
      <div className="dsa-start-screen">
        <div className="dsa-start-card">
          <div className="dsa-start-icon"><Code2 size={40} /></div>
          <h2 className="dsa-start-title">{problem.title}</h2>
          <div className="dsa-start-meta">
            <span className={`dsa-difficulty dsa-difficulty-${problem.difficulty}`}>{problem.difficulty}</span>
            <span className="dsa-meta-item"><Clock size={14} /> {session?.time_limit_minutes || 45} minutes</span>
            <span className="dsa-meta-item"><Code2 size={14} /> Python</span>
          </div>
          <p className="dsa-start-desc">
            Your timer will start once you click begin. Make sure you are ready before starting.
          </p>
          <button className="dsa-start-btn" onClick={handleStart}>
            <Play size={18} /> Begin Challenge
          </button>
        </div>
      </div>
    );
  }

  // ── Session expired / completed screen ──
  if (session && (session.status === 'completed' || (timeLeft !== null && timeLeft <= 0))) {
    return (
      <div className="dsa-start-screen">
        <div className="dsa-start-card">
          <div className="dsa-start-icon" style={{ background: session.best_score >= 50 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}>
            {session.best_score >= 50 ? <CheckCircle size={40} color="#22c55e" /> : <Clock size={40} color="#ef4444" />}
          </div>
          <h2 className="dsa-start-title">
            {session.best_score >= 50 ? 'Challenge Completed!' : 'Time\'s Up!'}
          </h2>
          <div className="dsa-start-meta">
            <span className={`dsa-difficulty dsa-difficulty-${problem.difficulty}`}>{problem.difficulty}</span>
            <span className="dsa-meta-item"><Code2 size={14} /> {problem.title}</span>
          </div>
          {session.best_score > 0 ? (
            <div style={{
              margin: '20px 0', padding: '16px 24px', borderRadius: '12px',
              background: session.best_score >= 50 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${session.best_score >= 50 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: session.best_score >= 50 ? '#22c55e' : '#ef4444' }}>
                {session.best_score}%
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>Best Score</div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: '20px 0' }}>
              No submissions were made during this session.
            </p>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Your results have been recorded. You'll hear back about the next steps via email.
          </p>
        </div>
      </div>
    );
  }

  const timeExpired = timeLeft !== null && timeLeft <= 0;
  const testCases = problem.test_cases || [];
  const passedCount = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;

  return (
    <div className="dsa-container">
      {/* Top Navbar */}
      <div className="dsa-navbar">
        <div className="dsa-navbar-left">
          <div className="dsa-logo"><Code2 size={18} /><span>Agentica</span></div>
          <div className="dsa-nav-divider" />
          <span className="dsa-nav-title">{problem.title}</span>
          <span className={`dsa-difficulty dsa-difficulty-${problem.difficulty}`}>{problem.difficulty}</span>
        </div>
        <div className="dsa-navbar-right">
          {tabViolations > 0 && (
            <div style={{ color: '#ef4444', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <EyeOff size={13} /> {tabViolations} tab violation{tabViolations > 1 ? 's' : ''}
            </div>
          )}
          {session?.best_score > 0 && (
            <div className="dsa-best-score"><CheckCircle size={14} />Best: {session.best_score}%</div>
          )}
          {timeLeft !== null && (
            <div className={`dsa-timer ${timeLeft < 300 ? 'dsa-timer-warning' : ''} ${timeLeft < 60 ? 'dsa-timer-critical' : ''}`}>
              <Clock size={15} /><span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab switch warning banner */}
      {showTabWarning && (
        <div style={{
          background: '#ef4444', color: '#fff', textAlign: 'center',
          padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600,
        }}>
          ⚠ Tab switch detected! Your activity is being monitored.
        </div>
      )}

      {/* Main Content */}
      <div className="dsa-main">
        {/* Left Panel */}
        <div className="dsa-left-panel">
          <div className="dsa-left-tabs">
            <button className={`dsa-tab ${leftTab === 'description' ? 'dsa-tab-active' : ''}`} onClick={() => setLeftTab('description')}>
              <FileText size={14} /> Description
            </button>
            <button className={`dsa-tab ${leftTab === 'submissions' ? 'dsa-tab-active' : ''}`} onClick={() => { setLeftTab('submissions'); loadSubmissions(); }}>
              <History size={14} /> Submissions
            </button>
          </div>
          <div className="dsa-left-content">
            {leftTab === 'description' ? (
              <ProblemDescription problem={problem} />
            ) : (
              <SubmissionsPanel submissions={submissions} selectedSubmission={selectedSubmission}
                onSelect={(sub) => { setSelectedSubmission(sub); if (sub?.source_code) setCode(sub.source_code); }} />
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className={`dsa-right-panel ${editorFullscreen ? 'dsa-fullscreen' : ''}`}>
          {/* Editor Header */}
          <div className="dsa-editor-header">
            <div className="dsa-editor-lang"><Code2 size={14} /><span>Python 3</span></div>
            <div className="dsa-editor-actions">
              <select className="dsa-font-select" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
                {[12, 13, 14, 15, 16, 18, 20].map(s => <option key={s} value={s}>{s}px</option>)}
              </select>
              <button className="dsa-icon-btn" title="Reset code" onClick={() => setCode(problem.starter_code?.python || '')}>
                <RotateCcw size={14} />
              </button>
              <button className="dsa-icon-btn" title={editorFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                onClick={() => setEditorFullscreen(!editorFullscreen)}>
                {editorFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="dsa-editor-body">
            <Editor height="100%" language="python" theme="vs-dark" value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize, minimap: { enabled: false }, scrollBeyondLastLine: false,
                wordWrap: 'on', tabSize: 4, automaticLayout: true,
                padding: { top: 12, bottom: 12 }, lineNumbers: 'on',
                renderLineHighlight: 'line', cursorBlinking: 'smooth',
                smoothScrolling: true, contextmenu: false, folding: true,
                bracketPairColorization: { enabled: true }, suggestOnTriggerCharacters: true,
              }}
            />
          </div>

          {/* Console Resizer */}
          <div className="dsa-console-resizer" onMouseDown={handleResizeStart} ref={resizerRef}>
            <button className="dsa-console-toggle" onClick={() => setConsoleOpen(!consoleOpen)}>
              <Terminal size={14} /><span>Console</span>
              {consoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>

          {consoleOpen && (
            <div className="dsa-console" style={{ height: consoleHeight }} ref={consoleRef}>
              <div className="dsa-console-tabs">
                <button className={`dsa-console-tab ${consoleTab === 'testcase' ? 'active' : ''}`} onClick={() => setConsoleTab('testcase')}>
                  Testcase
                </button>
                <button className={`dsa-console-tab ${consoleTab === 'result' ? 'active' : ''}`} onClick={() => setConsoleTab('result')}>
                  Test Result
                  {totalTests > 0 && (
                    <span className={`dsa-result-badge ${passedCount === totalTests ? 'pass' : 'fail'}`}>
                      {passedCount}/{totalTests}
                    </span>
                  )}
                </button>
                <button className={`dsa-console-tab ${consoleTab === 'custom' ? 'active' : ''}`} onClick={() => setConsoleTab('custom')}>
                  Custom Input
                </button>
              </div>
              <div className="dsa-console-body">
                {consoleTab === 'testcase' && (
                  <TestCaseView testCases={testCases} activeIndex={activeTestCase} onSelect={setActiveTestCase} />
                )}
                {consoleTab === 'result' && (
                  <TestResultView testResults={testResults} submissionResult={submissionResult} running={running} submitting={submitting} />
                )}
                {consoleTab === 'custom' && (
                  <CustomInputView customInput={customInput} setCustomInput={setCustomInput}
                    customOutput={customOutput} running={running} onRun={handleRunCustom} />
                )}
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="dsa-action-bar">
            <div className="dsa-action-left">
              <span className="dsa-shortcut-hint">Ctrl+' Run | Ctrl+Enter Submit</span>
            </div>
            <div className="dsa-action-right">
              <button className="dsa-btn dsa-btn-run" onClick={handleRun} disabled={running || submitting || timeExpired}>
                {running ? <><span className="dsa-spinner" /> Running...</> : <><Play size={15} /> Run Code</>}
              </button>
              <button className="dsa-btn dsa-btn-submit" onClick={handleSubmit} disabled={running || submitting || timeExpired}>
                {submitting ? <><span className="dsa-spinner" /> Submitting...</> : <><Send size={15} /> Submit</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════ */

function ProblemDescription({ problem }) {
  return (
    <div className="dsa-problem-desc">
      <h2 className="dsa-problem-title">{problem.title}</h2>
      <div className="dsa-problem-tags">
        <span className={`dsa-difficulty dsa-difficulty-${problem.difficulty}`}>{problem.difficulty}</span>
        <span className="dsa-tag"><Timer size={12} /> {problem.time_limit_seconds}s limit</span>
      </div>
      <div className="dsa-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.description}</ReactMarkdown>
      </div>
      {problem.constraints && (
        <div className="dsa-section">
          <h4 className="dsa-section-title">Constraints</h4>
          <div className="dsa-constraints">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.constraints}</ReactMarkdown>
          </div>
        </div>
      )}
      {problem.test_cases?.length > 0 && (
        <div className="dsa-section">
          <h4 className="dsa-section-title">Examples</h4>
          {problem.test_cases.map((tc, i) => (
            <div key={i} className="dsa-example">
              <div className="dsa-example-header">Example {i + 1}</div>
              <div className="dsa-example-body">
                <div className="dsa-example-row">
                  <span className="dsa-example-label">Input:</span>
                  <pre className="dsa-example-pre">{tc.input}</pre>
                </div>
                <div className="dsa-example-row">
                  <span className="dsa-example-label">Output:</span>
                  <pre className="dsa-example-pre">{tc.expected_output}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function TestCaseView({ testCases, activeIndex, onSelect }) {
  if (!testCases.length) return <div className="dsa-empty">No test cases available</div>;
  const tc = testCases[activeIndex] || testCases[0];
  return (
    <div className="dsa-testcase-view">
      <div className="dsa-case-tabs">
        {testCases.map((_, i) => (
          <button key={i} className={`dsa-case-tab ${i === activeIndex ? 'active' : ''}`} onClick={() => onSelect(i)}>
            Case {i + 1}
          </button>
        ))}
      </div>
      <div className="dsa-case-detail">
        <div className="dsa-case-field">
          <label>Input =</label>
          <pre className="dsa-case-pre">{tc.input || '(empty)'}</pre>
        </div>
        <div className="dsa-case-field">
          <label>Expected Output =</label>
          <pre className="dsa-case-pre">{tc.expected_output || '(empty)'}</pre>
        </div>
      </div>
    </div>
  );
}


function TestResultView({ testResults, submissionResult, running, submitting }) {
  if (running || submitting) {
    return (
      <div className="dsa-result-loading">
        <div className="dsa-loader-sm" />
        <span>{running ? 'Running tests...' : 'Judging all test cases...'}</span>
      </div>
    );
  }
  if (!testResults.length && !submissionResult) {
    return <div className="dsa-empty">Click <strong>Run Code</strong> to test against sample cases, or <strong>Submit</strong> to judge all.</div>;
  }

  const banner = submissionResult ? (
    <div className={`dsa-submission-banner ${submissionResult.status === 'accepted' ? 'accepted' : 'failed'}`}>
      <div className="dsa-banner-status">
        {submissionResult.status === 'accepted' ? <><CheckCircle size={20} /> Accepted</> : <><XCircle size={20} /> {STATUS_CONFIG[submissionResult.status]?.label || submissionResult.status}</>}
      </div>
      <div className="dsa-banner-meta">
        <span>Score: <strong>{submissionResult.score}%</strong></span>
        {submissionResult.test_results && <span>{submissionResult.test_results.filter(r => r.passed).length}/{submissionResult.test_results.length} passed</span>}
      </div>
    </div>
  ) : null;

  const visibleResults = testResults.filter(r => !r.is_hidden);
  const hiddenResults = testResults.filter(r => r.is_hidden);
  const hiddenPassed = hiddenResults.filter(r => r.passed).length;

  return (
    <div className="dsa-result-view">
      {banner}
      {visibleResults.map((tr, i) => <TestResultCard key={i} result={tr} index={i} />)}
      {hiddenResults.length > 0 && (
        <div className="dsa-hidden-summary">
          <EyeOff size={14} />
          <span>Hidden test cases: {hiddenPassed}/{hiddenResults.length} passed</span>
        </div>
      )}
    </div>
  );
}


function TestResultCard({ result, index }) {
  const [expanded, setExpanded] = useState(!result.passed);
  const cfg = STATUS_CONFIG[result.status] || STATUS_CONFIG.error;
  return (
    <div className={`dsa-result-card ${result.passed ? 'pass' : 'fail'}`}>
      <div className="dsa-result-header" onClick={() => setExpanded(!expanded)}>
        <div className="dsa-result-title">
          {result.passed ? <CheckCircle size={16} color="#22c55e" /> : <XCircle size={16} color="#ef4444" />}
          <span>Sample Test case {index}</span>
          <span className="dsa-status-chip" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
        </div>
        <div className="dsa-result-meta">
          {result.time_ms != null && <span className="dsa-time">{result.time_ms}ms</span>}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
      {expanded && (
        <div className="dsa-result-body">
          {result.input && (
            <div className="dsa-result-field"><label>Input</label><pre>{result.input}</pre></div>
          )}
          <div className="dsa-result-comparison">
            <div className="dsa-result-field"><label>Expected Output</label><pre>{result.expected || '(empty)'}</pre></div>
            <div className="dsa-result-field"><label>Your Output</label><pre className={result.passed ? '' : 'wrong'}>{result.actual || '(empty)'}</pre></div>
          </div>
          {result.stderr && (
            <div className="dsa-result-field error"><label>Stderr</label><pre>{result.stderr}</pre></div>
          )}
        </div>
      )}
    </div>
  );
}


function CustomInputView({ customInput, setCustomInput, customOutput, running, onRun }) {
  return (
    <div className="dsa-custom-view">
      <div className="dsa-custom-input-area">
        <label>Custom Input</label>
        <textarea className="dsa-custom-textarea" value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Enter your test input here..." rows={4} />
        <button className="dsa-btn dsa-btn-run dsa-btn-sm" onClick={onRun} disabled={running}>
          {running ? <><span className="dsa-spinner-sm" /> Running...</> : <><Play size={13} /> Run with Custom Input</>}
        </button>
      </div>
      {customOutput && (
        <div className="dsa-custom-output">
          <label>Output</label>
          <pre className={customOutput.error || customOutput.stderr ? 'error' : ''}>
            {customOutput.stdout || customOutput.stderr || customOutput.error || '(no output)'}
          </pre>
          {customOutput.time_ms != null && <span className="dsa-time">Runtime: {customOutput.time_ms}ms</span>}
        </div>
      )}
    </div>
  );
}


function SubmissionsPanel({ submissions, selectedSubmission, onSelect }) {
  if (!submissions.length) {
    return (
      <div className="dsa-empty" style={{ padding: '40px 20px' }}>
        <History size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p>No submissions yet</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Submit your code to see results here</p>
      </div>
    );
  }
  return (
    <div className="dsa-submissions-panel">
      {submissions.map((sub) => {
        const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.error;
        const isSelected = selectedSubmission?.id === sub.id;
        const passedCount = (sub.test_results || []).filter(r => r.passed).length;
        const totalCount = (sub.test_results || []).length;
        return (
          <div key={sub.id} className={`dsa-submission-row ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(isSelected ? null : sub)}>
            <div className="dsa-sub-left">
              <span className="dsa-sub-status" style={{ color: cfg.color }}>
                {sub.status === 'accepted' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {cfg.label}
              </span>
              <span className="dsa-sub-time">{new Date(sub.submitted_at).toLocaleString()}</span>
            </div>
            <div className="dsa-sub-right">
              <span className="dsa-sub-score">{sub.score}%</span>
              {totalCount > 0 && <span className="dsa-sub-cases">{passedCount}/{totalCount}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
