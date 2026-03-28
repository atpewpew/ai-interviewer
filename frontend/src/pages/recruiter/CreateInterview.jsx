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
    <>
      <style>{`
        .create-container {
          background-color: #0A0A0F;
          min-height: 100vh;
          font-family: 'Montserrat', sans-serif;
          position: relative;
          overflow-x: hidden;
        }
        .create-orb {
          position: absolute;
          top: -10%;
          right: -5%;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, #7353F6 0%, transparent 70%);
          opacity: 0.08;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .create-content {
          position: relative;
          z-index: 1;
        }
        .page-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.2rem;
          color: white;
          margin-bottom: 2rem;
        }
        .form-card {
          background: #12121A;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .section-label {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.7rem;
          color: #6B7280;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 0.5rem;
          display: block;
        }
        .dark-input, .dark-textarea, .dark-select {
          background-color: #0D0D14;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: white;
          font-family: 'Montserrat', sans-serif;
          padding: 12px 16px;
          width: 100%;
          transition: border-color 200ms, box-shadow 200ms;
          outline: none;
        }
        .dark-textarea {
          min-height: 120px;
          resize: vertical;
        }
        .dark-input::placeholder, .dark-textarea::placeholder {
          color: #4B5563;
        }
        .dark-input:focus, .dark-textarea:focus, .dark-select:focus {
          border-color: #7353F6;
          box-shadow: 0 0 0 3px rgba(115,83,246,0.15);
        }
        .dark-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 40px;
        }
        .dark-select option {
          background-color: #0D0D14;
          color: white;
        }
        
        .topic-pill {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #9CA3AF;
          border-radius: 100px;
          padding: 6px 14px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 200ms;
          user-select: none;
        }
        .topic-pill:hover {
          border-color: rgba(115,83,246,0.3);
        }
        .topic-pill.active {
          background: rgba(115,83,246,0.2);
          border: 1px solid rgba(115,83,246,0.5);
          color: #A88BFF;
          font-weight: 600;
        }
        .btn-add-topic {
          background: rgba(115,83,246,0.2);
          border: 1px solid rgba(115,83,246,0.4);
          color: #A88BFF;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          transition: background 200ms;
          cursor: pointer;
        }
        .btn-add-topic:hover {
          background: rgba(115,83,246,0.35);
        }

        .custom-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          background: #0D0D14;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          outline: none;
          margin-top: 10px;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid #7353F6;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(115,83,246,0.5);
        }
        .custom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid #7353F6;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(115,83,246,0.5);
        }

        .btn-submit {
          width: 100%;
          background: linear-gradient(to right, #7353F6, #00C0FF);
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.1rem;
          color: white;
          letter-spacing: 0.05em;
          box-shadow: 0 0 24px rgba(115,83,246,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: opacity 200ms, box-shadow 200ms;
        }
        .btn-submit:hover:not(:disabled) {
          opacity: 0.9;
          box-shadow: 0 0 32px rgba(115,83,246,0.5);
        }
        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
      <div className="create-container">
        <div className="create-orb"></div>
        <div className="create-content">
          <Navbar />
          <div className="container py-4" style={{ maxWidth: 700 }}>
            <h1 className="page-title">CREATE INTERVIEW</h1>

            {error && <div className="alert alert-danger py-2">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-card">
                <div className="mb-4">
                  <label className="section-label">Interview Title</label>
                  <input
                    className="dark-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g. Senior Backend Engineer - Round 1"
                  />
                </div>

                <div className="mb-4">
                  <label className="section-label">Job Role</label>
                  <input
                    className="dark-input"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    required
                    placeholder="e.g. Senior Backend Engineer"
                  />
                </div>

                <div>
                  <label className="section-label">Job Description</label>
                  <textarea
                    className="dark-textarea"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                    placeholder="Describe the role, responsibilities, and key requirements..."
                  />
                </div>
              </div>

              <div className="form-card">
                <label className="section-label mb-3">Topics</label>
                
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {TOPIC_SUGGESTIONS.map((t) => (
                    <div
                      key={t}
                      className={`topic-pill ${topics.includes(t) ? 'active' : ''}`}
                      onClick={() => (topics.includes(t) ? removeTopic(t) : addTopic(t))}
                    >
                      {t}
                    </div>
                  ))}
                  {topics.filter(t => !TOPIC_SUGGESTIONS.includes(t)).map((t) => (
                    <div
                      key={t}
                      className="topic-pill active d-flex align-items-center gap-1"
                      onClick={() => removeTopic(t)}
                    >
                      {t}
                      <X size={12} />
                    </div>
                  ))}
                </div>

                <div className="d-flex gap-2">
                  <input
                    className="dark-input"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Add custom topic"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomTopic();
                      }
                    }}
                  />
                  <button type="button" className="btn-add-topic" onClick={addCustomTopic}>
                    <PlusCircle size={18} />
                  </button>
                </div>
              </div>

              <div className="form-card">
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="section-label">Difficulty</label>
                    <select
                      className="dark-select"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="section-label">Number of Questions ({totalQuestions})</label>
                    <input
                      type="range"
                      className="custom-slider"
                      min={3}
                      max={20}
                      value={totalQuestions}
                      onChange={(e) => setTotalQuestions(Number(e.target.value))}
                      style={{ 
                        background: `linear-gradient(to right, #7353F6 0%, #00C0FF ${(totalQuestions - 3) / 17 * 100}%, #0D0D14 ${(totalQuestions - 3) / 17 * 100}%, #0D0D14 100%)`
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <>
                    <Save size={20} />
                    Create Interview
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
