import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../../api';
import Navbar from '../../components/shared/Navbar';
import { PlusCircle, X, Save, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

const ROUND_TYPES = [
  { value: 'ai_interview', label: 'AI Voice Interview', color: 'var(--primary-purple)' },
  { value: 'dsa_coding', label: 'DSA / Coding Round', color: '#3b82f6' },
  { value: 'live_1on1', label: 'Live 1-on-1 Interview', color: '#10b981' },
  { value: 'manual_review', label: 'Manual Review', color: '#f59e0b' },
];

const TOPIC_SUGGESTIONS = [
  'DSA', 'System Design', 'Behavioural', 'OOP', 'Databases',
  'Networking', 'OS', 'Web Development', 'Machine Learning', 'Cloud',
];

const emptyRound = () => ({
  id: crypto.randomUUID(),
  name: '',
  round_type: 'ai_interview',
  interview_config: { topics: [], difficulty: 'medium', total_questions: 7 },
});

export default function CreateJob() {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('full_time');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState([]);
  const [reqInput, setReqInput] = useState('');
  const [pipeline, setPipeline] = useState([emptyRound()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const addRequirement = () => {
    if (reqInput.trim()) {
      setRequirements([...requirements, reqInput.trim()]);
      setReqInput('');
    }
  };

  const addRound = () => setPipeline([...pipeline, emptyRound()]);

  const removeRound = (id) => {
    if (pipeline.length <= 1) return;
    setPipeline(pipeline.filter((r) => r.id !== id));
  };

  const moveRound = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= pipeline.length) return;
    const copy = [...pipeline];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setPipeline(copy);
  };

  const updateRound = (id, field, value) => {
    setPipeline(pipeline.map((r) =>
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const updateInterviewConfig = (id, key, value) => {
    setPipeline(pipeline.map((r) =>
      r.id === id
        ? { ...r, interview_config: { ...r.interview_config, [key]: value } }
        : r
    ));
  };

  const toggleTopic = (roundId, topic) => {
    setPipeline(pipeline.map((r) => {
      if (r.id !== roundId) return r;
      const topics = r.interview_config.topics.includes(topic)
        ? r.interview_config.topics.filter((t) => t !== topic)
        : [...r.interview_config.topics, topic];
      return { ...r, interview_config: { ...r.interview_config, topics } };
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pipeline.length === 0) { setError('Add at least one round'); return; }
    for (const r of pipeline) {
      if (!r.name.trim()) { setError('Every round needs a name'); return; }
    }
    setError('');
    setLoading(true);
    try {
      const pipelinePayload = pipeline.map((r, i) => {
        const base = {
          round_number: i + 1,
          name: r.name,
          round_type: r.round_type,
        };
        if (r.round_type === 'ai_interview') {
          base.interview_config = r.interview_config;
        }
        return base;
      });  
      await createJob({
        title, department, location, job_type: jobType,
        description, requirements, pipeline: pipelinePayload,
      });
      navigate('/recruiter/jobs');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      <div className="container py-4 page-content" style={{ maxWidth: 800 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          CREATE JOB OPENING
        </h1>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="card-glass mb-3">
            <h6 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              JOB DETAILS
            </h6>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Job Title</label>
              <input className="form-control-ios" value={title} onChange={(e) => setTitle(e.target.value)} required
                placeholder="e.g. Senior Backend Engineer" />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Department</label>
                <input className="form-control-ios" value={department} onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering" />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Location</label>
                <input className="form-control-ios" value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote / NYC" />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Type</label>
                <select className="form-control-ios" value={jobType} onChange={(e) => setJobType(e.target.value)}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Description</label>
              <textarea className="form-control-ios" value={description} onChange={(e) => setDescription(e.target.value)}
                required rows={4} placeholder="Describe the role, team, and responsibilities..." />
            </div>
            <div>
              <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Requirements</label>
              <div className="d-flex gap-2 mb-2">
                <input className="form-control-ios" value={reqInput} onChange={(e) => setReqInput(e.target.value)}
                  placeholder="Add a requirement" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())} />
                <button type="button" className="btn-outline-purple" onClick={addRequirement}><PlusCircle size={16} /></button>
              </div>
              {requirements.length > 0 && (
                <div className="d-flex flex-wrap gap-1">
                  {requirements.map((r, i) => (
                    <span key={i} className="chip d-flex align-items-center gap-1">
                      {r} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setRequirements(requirements.filter((_, j) => j !== i))} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pipeline Builder */}
          <div className="card-glass mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: 0 }}>
                HIRING PIPELINE
              </h6>
              <button type="button" className="btn-outline-purple d-flex align-items-center gap-1" style={{ fontSize: '0.8rem' }}
                onClick={addRound}>
                <PlusCircle size={14} /> Add Round
              </button>
            </div>

            {pipeline.map((round, idx) => {
              const rt = ROUND_TYPES.find((t) => t.value === round.round_type);
              return (
                <div key={round.id} style={{
                  border: `1px solid ${rt?.color || 'var(--border)'}22`,
                  borderLeft: `3px solid ${rt?.color || 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <GripVertical size={16} color="var(--text-muted)" />
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Round {idx + 1}
                    </span>
                    <div className="d-flex gap-1 ms-auto">
                      <button type="button" className="btn btn-sm" style={{ color: 'var(--text-muted)' }}
                        onClick={() => moveRound(idx, -1)} disabled={idx === 0}><ArrowUp size={14} /></button>
                      <button type="button" className="btn btn-sm" style={{ color: 'var(--text-muted)' }}
                        onClick={() => moveRound(idx, 1)} disabled={idx === pipeline.length - 1}><ArrowDown size={14} /></button>
                      {pipeline.length > 1 && (
                        <button type="button" className="btn btn-sm" style={{ color: 'var(--error)' }}
                          onClick={() => removeRound(round.id)}><X size={14} /></button>
                      )}
                    </div>
                  </div>

                  <div className="row g-2 mb-2">
                    <div className="col-md-6">
                      <input className="form-control-ios" placeholder="Round name (e.g. AI Technical Screen)"
                        value={round.name} onChange={(e) => updateRound(round.id, 'name', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <select className="form-control-ios" value={round.round_type}
                        onChange={(e) => updateRound(round.id, 'round_type', e.target.value)}>
                        {ROUND_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* AI Interview config */}
                  {round.round_type === 'ai_interview' && (
                    <div style={{ paddingLeft: '0.5rem', borderLeft: '2px solid var(--primary-purple)33', marginTop: '0.5rem' }}>
                      <div className="d-flex flex-wrap gap-1 mb-2">
                        {TOPIC_SUGGESTIONS.map((t) => (
                          <button key={t} type="button" className="chip" style={{
                            cursor: 'pointer', fontSize: '0.7rem',
                            background: round.interview_config.topics.includes(t) ? 'var(--primary-purple)' : 'var(--pale-purple)',
                            color: round.interview_config.topics.includes(t) ? 'white' : 'var(--primary-purple)',
                          }} onClick={() => toggleTopic(round.id, t)}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="row g-2">
                        <div className="col-6">
                          <select className="form-control-ios" style={{ fontSize: '0.8rem' }}
                            value={round.interview_config.difficulty}
                            onChange={(e) => updateInterviewConfig(round.id, 'difficulty', e.target.value)}>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                        <div className="col-6">
                          <div className="d-flex align-items-center gap-2">
                            <input type="range" className="form-range" min={3} max={20}
                              value={round.interview_config.total_questions}
                              onChange={(e) => updateInterviewConfig(round.id, 'total_questions', Number(e.target.value))}
                              style={{ accentColor: 'var(--primary-purple)' }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: 20 }}>
                              {round.interview_config.total_questions}Q
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Future round types — placeholder */}
                  {round.round_type === 'dsa_coding' && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                      DSA round configuration will be available soon.
                    </p>
                  )}
                  {round.round_type === 'live_1on1' && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                      Live 1-on-1 room will be provisioned when the round starts.
                    </p>
                  )}
                  {round.round_type === 'manual_review' && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                      HR manually reviews the candidate and decides to advance or reject.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button type="submit" className="btn-gradient w-100 d-flex align-items-center justify-content-center gap-2"
            disabled={loading} style={{ padding: '0.75rem' }}>
            {loading ? <span className="spinner-border spinner-border-sm" /> : <><Save size={18} /> Create Job Opening</>}
          </button>
        </form>
      </div>
    </div>
  );
}
