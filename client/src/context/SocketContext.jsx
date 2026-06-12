import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_URL } from '../utils/config';
import API from '../utils/axios';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineMap, setOnlineMap] = useState({});
  const { user } = useAuth();
  const heartbeatRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (socket) { socket.disconnect(); setSocket(null); }
      setOnlineUsers([]);
      return;
    }

    const newSocket = io(API_URL || '/', { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('connect', () => newSocket.emit('setup', user._id));
    newSocket.on('user-online', ({ userId }) => setOnlineUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId])));
    newSocket.on('user-offline', ({ userId }) => setOnlineUsers((prev) => prev.filter((id) => id !== userId)));

    const fetchOnline = async () => {
      try {
        const { data } = await API.get('/online');
        const map = {};
        const ids = data.filter((u) => {
          if (u.userId === user._id) return false;
          map[u.userId] = u.lastSeen;
          return true;
        }).map((u) => u.userId);
        setOnlineUsers(ids);
        setOnlineMap(map);
      } catch {}
    };

    const heartbeat = async () => {
      try { await API.post('/users/heartbeat'); } catch {}
    };

    heartbeat();
    fetchOnline();
    heartbeatRef.current = setInterval(heartbeat, 15000);
    pollRef.current = setInterval(fetchOnline, 15000);

    return () => {
      newSocket.disconnect();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, onlineMap }}>
      {children}
    </SocketContext.Provider>
  );
};
