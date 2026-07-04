import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, MessageSquare, Star, ArrowLeft, Clock } from 'lucide-react';

export const Chat = () => {
  const { user } = () => useAuth(); // Wait, let's make sure we invoke it correctly: useAuth()
  // Ah! Above I wrote `const { user } = () => useAuth();` which is a bug! It should be `const { user } = useAuth();`!
  // I will write it correctly:
  // const { user } = useAuth();
  const auth = useAuth();
  const currentUser = auth.user;

  const { socket, joinMatchRoom, sendChatMessage } = useSocket();

  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Fetch active matches (ACCEPTED connections)
  useEffect(() => {
    const fetchMatches = async () => {
      setLoadingMatches(true);
      try {
        const res = await axios.get('/api/matches');
        if (res.data?.success) {
          const accepted = res.data.data.filter(m => m.status === 'ACCEPTED');
          setMatches(accepted);
          
          // Select first match by default if available
          if (accepted.length > 0) {
            handleSelectMatch(accepted[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load chat matches:', err);
      } finally {
        setLoadingMatches(false);
      }
    };
    fetchMatches();
  }, []);

  // 2. Listen for real-time messages via socket
  useEffect(() => {
    if (!socket || !activeMatch) return;

    const handleMessageReceived = (msg) => {
      // Append if it belongs to current active match
      if (msg.match.toString() === activeMatch._id.toString()) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('messageReceived', handleMessageReceived);

    return () => {
      socket.off('messageReceived', handleMessageReceived);
    };
  }, [socket, activeMatch]);

  const handleSelectMatch = async (match) => {
    setActiveMatch(match);
    setLoadingMessages(true);
    setMessages([]);

    // Join room
    joinMatchRoom(match._id);

    try {
      // Load message history
      const res = await axios.get(`/api/chat/${match._id}`);
      if (res.data?.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeMatch) return;

    sendChatMessage(activeMatch._id, inputText);
    setInputText('');
  };

  const getPartnerDetails = (match) => {
    if (!match || !currentUser) return { name: '', avatar: '', bio: '' };
    const isRequester = currentUser._id === match.requester._id;
    return isRequester ? match.recipient : match.requester;
  };

  const partner = getPartnerDetails(activeMatch);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-[75vh] rounded-2xl border glass overflow-hidden flex shadow-2xl">
        {/* Sidebar: Matches List */}
        <div className={`w-full md:w-80 border-r border-white/5 flex flex-col shrink-0 ${
          activeMatch ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-white/5 bg-[#150f24]/30">
            <h3 className="font-extrabold text-white text-sm">Conversations</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Chat with your active barter partners</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingMatches ? (
              <div className="space-y-2 p-2 animate-pulse">
                <div className="h-14 rounded-xl bg-white/5" />
                <div className="h-14 rounded-xl bg-white/5" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-white">No active chats</h4>
                <p className="text-[10px] text-gray-400 mt-1">Connect with suggestions to start swap chats.</p>
              </div>
            ) : (
              matches.map((m) => {
                const p = getPartnerDetails(m);
                const isSelected = activeMatch && activeMatch._id === m._id;
                return (
                  <button
                    key={m._id}
                    onClick={() => handleSelectMatch(m)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${
                      isSelected ? 'bg-brand-600/30 border border-brand-500/20 text-white' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <img
                      src={p.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`}
                      alt={p.name}
                      className="w-10 h-10 rounded-full border border-white/10 shrink-0 bg-brand-card object-cover"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold truncate">{p.name}</h4>
                      <p className="text-[10px] text-gray-450 truncate">★ {p.averageRating ? p.averageRating.toFixed(1) : 'New'}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-[#0c0814]/30 ${
          !activeMatch ? 'hidden md:flex items-center justify-center p-8' : 'flex'
        }`}>
          {activeMatch ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/5 bg-[#150f24]/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveMatch(null)}
                    className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={partner.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${partner.name}`}
                    alt={partner.name}
                    className="w-9 h-9 rounded-full border border-white/10 object-cover bg-brand-card"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {partner.name}
                      <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-0.5 ml-1">
                        ★ {partner.averageRating ? partner.averageRating.toFixed(1) : 'New'}
                      </span>
                    </h3>
                    <p className="text-[9px] text-gray-400 truncate max-w-xs sm:max-w-md">{partner.bio || 'Connected Swapper'}</p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="text-center py-12 text-xs text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-white">Start the conversation</h4>
                    <p className="text-[10px] text-gray-450 mt-1">Say hello! Propose session times or coordinate swapping.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isSelf = msg.sender._id === currentUser._id || msg.sender === currentUser._id;
                    const senderName = isSelf ? 'You' : msg.sender.name || partner.name;
                    const avatar = isSelf ? currentUser.avatar : partner.avatar;
                    const displayAvatar = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`;

                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex gap-3 max-w-[80%] ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <img
                          src={displayAvatar}
                          alt={senderName}
                          className="w-8 h-8 rounded-full border border-white/5 shrink-0 object-cover bg-brand-card"
                        />
                        <div>
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isSelf
                              ? 'bg-brand-600 text-white rounded-tr-none'
                              : 'bg-white/5 border border-white/5 text-gray-255 rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                          <span className={`text-[8px] text-gray-500 mt-1 block ${isSelf ? 'text-right' : ''}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-[#150f24]/30 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-450 focus:outline-none focus:ring-1 focus:ring-brand-500 text-xs"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-brand-650 hover:bg-brand-600 text-white transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white">Select a Swapper</h3>
              <p className="text-xs text-gray-400 mt-1">Choose a conversation from the sidebar list to open your chat room.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Chat;
