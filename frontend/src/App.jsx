import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import RecruiterLogin from './pages/recruiter/RecruiterLogin';
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import CreateInterview from './pages/recruiter/CreateInterview';
import CandidateList from './pages/recruiter/CandidateList';
import CandidateReport from './pages/recruiter/CandidateReport';
import CandidateEntry from './pages/candidate/CandidateEntry';
import InterviewLobby from './pages/candidate/InterviewLobby';
import InterviewRoom from './pages/candidate/InterviewRoom';
import InterviewComplete from './pages/candidate/InterviewComplete';

function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
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

      {/* Candidate routes (no auth needed — link is the credential) */}
      <Route path="/interview/:interviewId/join" element={<CandidateEntry />} />
      <Route path="/interview/:interviewId/lobby" element={<InterviewLobby />} />
      <Route path="/interview/:interviewId/room" element={<InterviewRoom />} />
      <Route path="/interview/complete" element={<InterviewComplete />} />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          user?.role === 'recruiter' ? (
            <Navigate to="/recruiter/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
