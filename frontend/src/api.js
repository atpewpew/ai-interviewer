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

// WebSocket URL
export const getWSUrl = (sessionId) =>
  `ws://localhost:8000/ws/interview/${sessionId}`;

export default api;
