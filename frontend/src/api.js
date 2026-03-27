import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);

// Interviews
export const createInterview = (data) => api.post('/interviews/', data);
export const getInterviews = () => api.get('/interviews/');
export const getInterview = (id) => api.get(`/interviews/${id}`);
export const deleteInterview = (id) => api.delete(`/interviews/${id}`);
export const getDashboardStats = () => api.get('/interviews/stats');

// Candidates
export const registerCandidate = (formData) =>
  api.post('/candidates/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getCandidatesForInterview = (interviewId) =>
  api.get(`/candidates/interview/${interviewId}`);
export const getCandidate = (id) => api.get(`/candidates/${id}`);

// Sessions
export const getSession = (id) => api.get(`/sessions/${id}`);
export const getSessionByCandidate = (candidateId) =>
  api.get(`/sessions/candidate/${candidateId}`);
export const submitProctoringFlag = (sessionId, flag) =>
  api.post(`/sessions/${sessionId}/flag`, flag);
export const getSessionMessages = (sessionId) =>
  api.get(`/sessions/${sessionId}/messages`);

// Reports
export const getReportBySession = (sessionId) =>
  api.get(`/reports/session/${sessionId}`);
export const getReport = (id) => api.get(`/reports/${id}`);

// Jobs (ATS)
export const createJob = (data) => api.post('/jobs/', data);
export const getJobs = () => api.get('/jobs/');
export const getJob = (id) => api.get(`/jobs/${id}`);
export const getPublicJob = (id) => api.get(`/jobs/public/${id}`);
export const updateJob = (id, data) => api.put(`/jobs/${id}`, data);
export const deleteJob = (id) => api.delete(`/jobs/${id}`);

// Applications (ATS)
export const applyToJob = (jobId, formData) =>
  api.post(`/applications/apply/${jobId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getApplicationsForJob = (jobId) =>
  api.get(`/applications/job/${jobId}`);
export const getApplication = (id) => api.get(`/applications/${id}`);
export const advanceApplication = (id, data) =>
  api.post(`/applications/${id}/advance`, data);
export const startRound = (id) =>
  api.post(`/applications/${id}/start-round`);

// DSA Coding
export const getDSASession = (sessionId) => api.get(`/dsa/session/${sessionId}`);
export const startDSASession = (sessionId) => api.post(`/dsa/session/${sessionId}/start`);
export const submitDSACode = (sessionId, data) => api.post(`/dsa/session/${sessionId}/submit`, data);
export const runDSACode = (sessionId, data) => api.post(`/dsa/session/${sessionId}/run`, data);
export const runDSACustom = (sessionId, data) => api.post(`/dsa/session/${sessionId}/run-custom`, data);
export const getDSASubmissions = (sessionId) => api.get(`/dsa/session/${sessionId}/submissions`);
export const getDSASubmission = (sessionId, subId) => api.get(`/dsa/session/${sessionId}/submissions/${subId}`);
export const endDSASession = (sessionId) => api.post(`/dsa/session/${sessionId}/end`);
export const reportDSAProctorEvent = (sessionId, data) => api.post(`/dsa/session/${sessionId}/proctor-event`, data);
export const createDSAProblem = (data) => api.post('/dsa/problems', data);
export const getDSAProblems = () => api.get('/dsa/problems');

// Live 1-on-1 Room
export const getLiveRoom = (roomId) => api.get(`/live-room/${roomId}`);
export const addHRNote = (roomId, data) => api.post(`/live-room/${roomId}/notes`, data);
export const endLiveRoom = (roomId) => api.post(`/live-room/${roomId}/end`);

// Scorecard
export const getScorecard = (appId) => api.get(`/scorecard/${appId}`);

// WebSocket URL
export const getWSUrl = (sessionId) =>
  `ws://localhost:8000/ws/interview/${sessionId}`;

export default api;
