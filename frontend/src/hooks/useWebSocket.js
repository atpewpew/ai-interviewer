import { useCallback, useRef, useState } from 'react';
import { getWSUrl } from '../api';

export function useWebSocket(sessionId) {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback((onMessage) => {
    if (!sessionId) return;
    const ws = new WebSocket(getWSUrl(sessionId));
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = (err) => console.error('WS error:', err);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    return ws;
  }, [sessionId]);

  const sendBinary = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const sendJSON = useCallback((obj) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return { wsRef, isConnected, connect, sendBinary, sendJSON, disconnect };
}
