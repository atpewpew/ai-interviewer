import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCandidatesForInterview, getInterview } from '../../api';
import Navbar from '../../components/shared/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import CandidateCard from '../../components/recruiter/CandidateCard';
import { Users, ArrowLeft, Copy } from 'lucide-react';

export default function CandidateList() {
  const { interviewId } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [candRes, intRes] = await Promise.all([
          getCandidatesForInterview(interviewId),
          getInterview(interviewId),
        ]);
        setCandidates(candRes.data);
        setInterview(intRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [interviewId]);

  const candidateLink = `${window.location.origin}/interview/${interviewId}/join`;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8fc' }}>
      <Navbar />
      <div className="container py-4">
        <Link
          to="/recruiter/dashboard"
          className="d-flex align-items-center gap-1 mb-3"
          style={{ color: 'var(--primary-purple)', textDecoration: 'none', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {interview && (
          <div className="mb-4">
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--graphite-black)' }}>
              {interview.title}
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>{interview.job_role}</p>
          </div>
        )}

        {/* Candidate invite link */}
        <div className="card-ios d-flex align-items-center justify-content-between mb-4" style={{ background: 'var(--pale-purple)' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-purple)' }}>
              Candidate Invite Link
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--graphite-black)' }}>
              {candidateLink}
            </div>
          </div>
          <button
            className="btn-primary-ios d-flex align-items-center gap-1"
            onClick={() => {
              navigator.clipboard.writeText(candidateLink);
              alert('Link copied!');
            }}
          >
            <Copy size={14} /> Copy
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : candidates.length === 0 ? (
          <div className="card-ios text-center py-5">
            <Users size={48} color="var(--light-gray)" className="mb-3" />
            <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--graphite-black)' }}>
              NO CANDIDATES YET
            </h4>
            <p style={{ color: 'var(--text-muted)' }}>
              Share the invite link with candidates to get started
            </p>
          </div>
        ) : (
          <div className="row g-3">
            {candidates.map((c) => (
              <div key={c.id} className="col-md-6 col-lg-4">
                <CandidateCard candidate={c} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
