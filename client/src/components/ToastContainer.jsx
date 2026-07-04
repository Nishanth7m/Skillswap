import React, { useState, useEffect } from 'react';
import { MessageSquare, Heart, Calendar, Bell, X } from 'lucide-react';

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const notif = e.detail;
      const id = Math.random().toString(36).substring(2, 9);
      
      const newToast = {
        id,
        type: notif.type,
        data: notif.data,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

    window.addEventListener('app-toast', handleToast);
    return () => {
      window.removeEventListener('app-toast', handleToast);
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastConfig = (type) => {
    switch (type) {
      case 'NEW_MESSAGE':
        return {
          icon: <MessageSquare className="text-blue-400 w-5 h-5" />,
          title: 'New Message',
          bg: 'border-blue-500/30 bg-blue-950/40',
        };
      case 'NEW_MATCH_REQUEST':
        return {
          icon: <Heart className="text-rose-400 w-5 h-5 fill-rose-400/20" />,
          title: 'New Match Request',
          bg: 'border-rose-500/30 bg-rose-950/40',
        };
      case 'MATCH_ACCEPTED':
        return {
          icon: <Heart className="text-emerald-400 w-5 h-5 fill-emerald-400/20" />,
          title: 'Match Connected!',
          bg: 'border-emerald-500/30 bg-emerald-950/40',
        };
      case 'SESSION_PROPOSAL':
        return {
          icon: <Calendar className="text-purple-400 w-5 h-5" />,
          title: 'Session Proposed',
          bg: 'border-purple-500/30 bg-purple-950/40',
        };
      case 'SESSION_ACCEPTED':
        return {
          icon: <Calendar className="text-green-400 w-5 h-5" />,
          title: 'Session Confirmed!',
          bg: 'border-green-500/30 bg-green-950/40',
        };
      case 'SESSION_COMPLETED':
        return {
          icon: <Calendar className="text-amber-400 w-5 h-5" />,
          title: 'Session Completed!',
          bg: 'border-amber-500/30 bg-amber-950/40',
        };
      case 'SESSION_CANCELLED':
        return {
          icon: <X className="text-red-400 w-5 h-5" />,
          title: 'Session Cancelled',
          bg: 'border-red-500/30 bg-red-950/40',
        };
      default:
        return {
          icon: <Bell className="text-indigo-400 w-5 h-5" />,
          title: 'Notification',
          bg: 'border-indigo-500/30 bg-indigo-950/40',
        };
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((toast) => {
        const config = getToastConfig(toast.type);
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border glass backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-0 animate-slide-in ${config.bg}`}
          >
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white">{config.title}</h4>
              <p className="text-xs text-gray-300 mt-1 truncate">
                {toast.type === 'NEW_MESSAGE' && `${toast.data.senderName}: ${toast.data.content}`}
                {toast.type === 'NEW_MATCH_REQUEST' && `${toast.data.requesterName} wants to connect with you.`}
                {toast.type === 'MATCH_ACCEPTED' && `You are now connected with ${toast.data.recipientName}!`}
                {toast.type === 'SESSION_PROPOSAL' && `${toast.data.proposerName} proposed a session.`}
                {toast.type === 'SESSION_ACCEPTED' && `Session confirmed by ${toast.data.acceptorName}.`}
                {toast.type === 'SESSION_COMPLETED' && `Session completed by ${toast.data.completionName}.`}
                {toast.type === 'SESSION_CANCELLED' && `Session cancelled by ${toast.data.cancellerName}.`}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
