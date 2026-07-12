import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://athletic-connection-production-7781.up.railway.app');

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user || !SOCKET_URL) return;

    const s = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
    setSocket(s);

    s.on('connect', () => {
      setConnected(true);
      if (user.role === 'employee') s.emit('join-chat-room', user._id);
    });
    s.on('disconnect', () => setConnected(false));

    return () => { s.disconnect(); setSocket(null); };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
