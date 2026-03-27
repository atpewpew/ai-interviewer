import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import RecruiterLogin from './pages/recruiter/RecruiterLogin';
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import CreateInterview from './pages/recruiter/CreateInterview';
import CandidateList from './pages/recruiter/CandidateList';
import CandidateReport from './pages/recruiter/CandidateReport';
import JobList from './pages/recruiter/JobList';
import CreateJob from './pages/recruiter/CreateJob';
import JobPipeline from './pages/recruiter/JobPipeline';
import LiveRoom from './pages/recruiter/LiveRoom';
import Scorecard from './pages/recruiter/Scorecard';
import CandidateEntry from './pages/candidate/CandidateEntry';
import InterviewLobby from './pages/candidate/InterviewLobby';
import InterviewRoom from './pages/candidate/InterviewRoom';
import InterviewComplete from './pages/candidate/InterviewComplete';
import JobApplication from './pages/candidate/JobApplication';
import DSATest from './pages/candidate/DSATest';
import LiveRoomCandidate from './pages/candidate/LiveRoomCandidate';

function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={user?.role === 'recruiter' ? <Navigate to="/recruiter/dashboard" replace /> : <LandingPage />} />

      {/* Auth */}
      <Route path="/login" element={<RecruiterLogin />} />

      {/* Recruiter routes */}
      <Route
        path="/recruiter/dashboard"
        element={
          <ProtectedRoute role="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/create"
        element={
          <ProtectedRoute role="recruiter">
            <CreateInterview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/interviews/:interviewId/candidates"
        element={
          <ProtectedRoute role="recruiter">
            <CandidateList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/candidates/:candidateId/report"
        element={
          <ProtectedRoute role="recruiter">
            <CandidateReport />
          </ProtectedRoute>
        }
      />

      {/* ATS — Job Pipeline routes */}
      <Route
        path="/recruiter/jobs"
        element={
          <ProtectedRoute role="recruiter">
            <JobList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/jobs/create"
        element={
          <ProtectedRoute role="recruiter">
            <CreateJob />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/jobs/:jobId/pipeline"
        element={
          <ProtectedRoute role="recruiter">
            <JobPipeline />
          </ProtectedRoute>
        }
      />

      {/* Public — Job Application (no auth) */}
      <Route path="/jobs/:jobId/apply" element={<JobApplication />} />

      {/* DSA Test (candidate, no auth — link is credential) */}
      <Route path="/dsa/:sessionId" element={<DSATest />} />

      {/* Live Room — candidate view (no auth) */}
      <Route path="/live-room/:roomId/candidate" element={<LiveRoomCandidate />} />

      {/* Live Room — HR view (auth required) */}
      <Route
        path="/recruiter/live-room/:roomId"
        element={
          <ProtectedRoute role="recruiter">
            <LiveRoom />
          </ProtectedRoute>
        }
      />

      {/* Scorecard — aggregated view (auth required) */}
      <Route
        path="/recruiter/scorecard/:appId"
        element={
          <ProtectedRoute role="recruiter">
            <Scorecard />
          </ProtectedRoute>
        }
      />

      {/* Candidate routes (no auth needed — link is the credential) */}
      <Route path="/interview/:interviewId/join" element={<CandidateEntry />} />
      <Route path="/interview/:interviewId/lobby" element={<InterviewLobby />} />
      <Route path="/interview/:interviewId/room" element={<InterviewRoom />} />
      <Route path="/interview/complete" element={<InterviewComplete />} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
