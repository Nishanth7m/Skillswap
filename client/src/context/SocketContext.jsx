import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { accessToken, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to Socket.io server passing token in auth payload
    const newSocket = io('https://skillswap-backend-769621790187.us-central1.run.app', {
      auth: {
        token: accessToken,
      },
    });

    newSocket.on('connect', () => {
      console.log('Socket.io connection established.');
    });

    // Listen for live alerts
    newSocket.on('notification', (notif) => {
      console.log('Received socket notification:', notif);
      setNotifications((prev) => [notif, ...prev]);

      // Trigger standard browser notification or UI Toast (will be handled by pages)
      const toastEvent = new CustomEvent('app-toast', { detail: notif });
      window.dispatchEvent(toastEvent);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [accessToken]);

  // Direct socket helpers
  const joinMatchRoom = (matchId) => {
    if (socket) {
      socket.emit('joinMatchRoom', { matchId });
    }
  };

  const sendChatMessage = (matchId, content) => {
    if (socket) {
      socket.emit('sendMessage', { matchId, content });
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        joinMatchRoom,
        sendChatMessage,
        clearNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
