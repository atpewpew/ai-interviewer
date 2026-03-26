import { createContext, useContext, useRef, useState, useCallback } from 'react';
import { getWSUrl } from '../api';

const InterviewContext = createContext(null);

export function InterviewProvider({ children }) {
  const wsRef = useRef(null);
  const [sessionId, setSessionId] = useState(null);
  const [interviewState, setInterviewState] = useState('IDLE'); // IDLE, AI_SPEAKING, LISTENING, PROCESSING, SCORING, COMPLETED
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [turnNumber, setTurnNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [turnScores, setTurnScores] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const connectWS = useCallback((sid) => {
    // Close any existing connection first (handles React StrictMode double-mount)
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setSessionId(sid);
    const ws = new WebSocket(getWSUrl(sid));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'question':
          setCurrentQuestion(data.question);
          setCurrentTopic(data.topic || '');
          setTurnNumber(data.turn_number);
          setTotalQuestions(data.total_questions);
          setInterviewState('AI_SPEAKING');
          break;

        case 'interim_transcript':
          setInterimTranscript(data.transcript);
          break;

        case 'transcript_final':
          setTranscript(data.transcript);
          setInterimTranscript('');
          break;

        case 'processing':
          setInterviewState('PROCESSING');
          break;

        case 'result':
          setTranscript(data.transcript);
          if (data.scores) {
            setTurnScores((prev) => [...prev, {
              turn: data.turn_number || turnNumber,
              ...data.scores,
              feedback: data.feedback,
            }]);
          }
          setFeedback(data.feedback || '');

          if (data.is_complete) {
            setIsComplete(true);
            setInterviewState('COMPLETED');
          } else {
            setInterviewState('SCORING');
            // After showing score, set next question
            setTimeout(() => {
              setCurrentQuestion(data.next_question || '');
              setCurrentTopic(data.topic || '');
              setTurnNumber(data.turn_number);
              setTotalQuestions(data.total_questions);
              setTranscript('');
              setInterimTranscript('');
              setInterviewState('AI_SPEAKING');
            }, 2500);
          }
          break;

        case 'error':
          console.error('Interview error:', data.message);
          break;

        case 'ended':
          setIsComplete(true);
          setInterviewState('COMPLETED');
          break;

        default:
          break;
      }
    };

    ws.onerror = (err) => console.error('WS error:', err);
    ws.onclose = () => console.log('WS closed');

    return ws;
  }, [turnNumber]);

  const sendAudio = useCallback((audioData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioData);
    }
  }, []);

  const sendCommand = useCallback((command) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
    }
  }, []);

  const disconnectWS = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  return (
    <InterviewContext.Provider value={{
      wsRef, sessionId, interviewState, setInterviewState,
      currentQuestion, currentTopic, turnNumber, totalQuestions,
      transcript, interimTranscript, turnScores, feedback, isComplete,
      connectWS, sendAudio, sendCommand, disconnectWS,
    }}>
      {children}
    </InterviewContext.Provider>
  );
}

export const useInterview = () => useContext(InterviewContext);
