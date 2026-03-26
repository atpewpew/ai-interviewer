import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInterview } from '../../api';
import Navbar from '../../components/shared/Navbar';
import { PlusCircle, X, Save } from 'lucide-react';

const TOPIC_SUGGESTIONS = [
  'DSA', 'System Design', 'Behavioural', 'OOP', 'Databases',
  'Networking', 'OS', 'Web Development', 'Machine Learning', 'Cloud',
];

export default function CreateInterview() {
  const [title, setTitle] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [topics, setTopics] = useState([]);
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [totalQuestions, setTotalQuestions] = useState(8);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const addTopic = (t) => {
    if (!topics.includes(t)) setTopics([...topics, t]);
  };

  const removeTopic = (t) => setTopics(topics.filter((x) => x !== t));

  const addCustomTopic = () => {
    if (customTopic.trim() && !topics.includes(customTopic.trim())) {
      setTopics([...topics, customTopic.trim()]);
      setCustomTopic('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (topics.length === 0) {
      setError('Add at least one topic');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createInterview({
        title,
        job_role: jobRole,
        job_description: jobDescription,
        topics,
        difficulty,
        total_questions: totalQuestions,
      });
      navigate('/recruiter/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      <div className="container py-4 page-content" style={{ maxWidth: 700 }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '2rem',
            color: 'var(--text-primary)',
            marginBottom: '1.5rem',
          }}
        >
          CREATE INTERVIEW
        </h1>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="card-glass mb-3">
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                Interview Title
              </label>
              <input
                className="form-control-ios"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Senior Backend Engineer - Round 1"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                Job Role
              </label>
              <input
                className="form-control-ios"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                required
                placeholder="e.g. Senior Backend Engineer"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                Job Description
              </label>
              <textarea
                className="form-control-ios"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
                rows={4}
                placeholder="Describe the role, responsibilities, and key requirements..."
              />
            </div>
          </div>

          <div className="card-glass mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
              Topics
            </label>

            <div className="d-flex flex-wrap gap-2 mb-2">
              {TOPIC_SUGGESTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={topics.includes(t) ? 'chip' : 'chip'}
                  style={{
                    cursor: 'pointer',
                    background: topics.includes(t) ? 'var(--primary-purple)' : 'var(--pale-purple)',
                    color: topics.includes(t) ? 'white' : 'var(--primary-purple)',
                  }}
                  onClick={() => (topics.includes(t) ? removeTopic(t) : addTopic(t))}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="d-flex gap-2">
              <input
                className="form-control-ios"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Add custom topic"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTopic())}
              />
              <button type="button" className="btn-outline-purple" onClick={addCustomTopic}>
                <PlusCircle size={16} />
              </button>
            </div>

            {topics.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mt-2">
                {topics.map((t) => (
                  <span key={t} className="chip d-flex align-items-center gap-1">
                    {t}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTopic(t)} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card-glass mb-3">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                  Difficulty
                </label>
                <select
                  className="form-control-ios"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                  Number of Questions ({totalQuestions})
                </label>
                <input
                  type="range"
                  className="form-range"
                  min={3}
                  max={20}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  style={{ accentColor: 'var(--primary-purple)' }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-gradient w-100 d-flex align-items-center justify-content-center gap-2"
            disabled={loading}
            style={{ padding: '0.75rem' }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <>
                <Save size={18} />
                Create Interview
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
