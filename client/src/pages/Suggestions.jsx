import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Users, Award, Calendar, Heart, ThumbsUp, Check, X, Star } from 'lucide-react';

export const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingConnect, setPendingConnect] = useState({}); // userId -> status

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch suggestions
      const suggRes = await axios.get('/api/matches/suggestions');
      if (suggRes.data?.success) {
        setSuggestions(suggRes.data.data);
      }

      // 2. Fetch matches (to extract incoming pending requests)
      const matchesRes = await axios.get('/api/matches');
      if (matchesRes.data?.success) {
        // Filter matches where recipient is current user and status is PENDING
        const incoming = matchesRes.data.data.filter(m => 
          m.status === 'PENDING' && 
          m.recipient._id !== undefined // Check populated
        );
        // Find which user is the other user (requester)
        // Since we are the recipient, requester is the other user
        const formattedIncoming = incoming.map(m => ({
          matchId: m._id,
          user: m.requester,
          score: m.score,
        }));
        setIncomingRequests(formattedIncoming);
      }
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Send a connection request to a suggested user
  const handleConnect = async (userId) => {
    try {
      setPendingConnect(prev => ({ ...prev, [userId]: 'sending' }));
      const res = await axios.post('/api/matches/request', { recipientId: userId });
      if (res.data?.success) {
        setPendingConnect(prev => ({ ...prev, [userId]: 'sent' }));
      }
    } catch (err) {
      console.error('Match connection request failed:', err);
      alert(err.response?.data?.message || 'Failed to send request');
      setPendingConnect(prev => ({ ...prev, [userId]: null }));
    }
  };

  // Accept a connection request
  const handleAcceptRequest = async (matchId, userId) => {
    try {
      const res = await axios.put(`/api/matches/${matchId}/accept`);
      if (res.data?.success) {
        // Remove from list and refresh data
        setIncomingRequests(prev => prev.filter(r => r.matchId !== matchId));
        fetchData();
      }
    } catch (err) {
      console.error('Accept request failed:', err);
    }
  };

  // Decline a connection request
  const handleDeclineRequest = async (matchId) => {
    try {
      const res = await axios.put(`/api/matches/${matchId}/decline`);
      if (res.data?.success) {
        setIncomingRequests(prev => prev.filter(r => r.matchId !== matchId));
      }
    } catch (err) {
      console.error('Decline request failed:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="w-6 h-6 text-brand-400 fill-brand-400/20" />
        <h2 className="text-2xl font-extrabold text-white">Smart Match Suggestions</h2>
      </div>

      {/* Incoming Connection Requests Section */}
      {incomingRequests.length > 0 && (
        <div className="mb-10">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
            Incoming Connection Requests ({incomingRequests.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incomingRequests.map((req) => (
              <div key={req.matchId} className="p-5 rounded-2xl border border-rose-500/20 bg-rose-950/10 flex items-center justify-between gap-4">
                <div className="flex gap-3">
                  <img
                    src={req.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${req.user.name}`}
                    alt={req.user.name}
                    className="w-12 h-12 rounded-full border border-white/10 shrink-0 bg-brand-card object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {req.user.name}
                      <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-0.5 ml-1">
                        <Star className="w-3 h-3 fill-yellow-400" />
                        {req.user.averageRating ? req.user.averageRating.toFixed(1) : 'New'}
                      </span>
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{req.user.bio || 'Wants to swap skills with you!'}</p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAcceptRequest(req.matchId, req.user._id)}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    title="Accept Match"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.matchId)}
                    className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900 border border-red-500/20 text-red-400 transition-colors"
                    title="Decline Match"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* suggestions list */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-60 rounded-2xl border glass opacity-55" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl glass">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Match Recommendations</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Add skills you want to learn in your profile to trigger suggestions, or search manually on the Browse page.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {suggestions.map((item) => {
            const status = pendingConnect[item.user._id];
            return (
              <div
                key={item.user._id}
                className="p-6 rounded-2xl border glass shadow-lg flex flex-col lg:flex-row justify-between gap-6"
              >
                {/* User details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-4">
                    <img
                      src={item.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user.name}`}
                      alt={item.user.name}
                      className="w-14 h-14 rounded-full border border-white/10 shrink-0 bg-brand-card object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-extrabold text-white">{item.user.name}</h3>
                        <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 fill-yellow-400" />
                          {item.user.averageRating ? item.user.averageRating.toFixed(1) : 'New'}
                          <span className="text-gray-450 ml-0.5">({item.user.reviewCount})</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-350 mt-1 line-clamp-2">{item.user.bio || 'No biography details provided.'}</p>
                    </div>
                  </div>

                  {/* Skills Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 border-t border-white/5 pt-4">
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-2">Can Teach You</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {item.user.skillsToTeach.map((s, idx) => (
                          <span key={idx} className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {s.skill.name} • {s.proficiency}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-brand-400 mb-2">Wants to Learn</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {item.user.skillsToLearn.map((s, idx) => (
                          <span key={idx} className="text-xs px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                            {s.skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score panel */}
                <div className="w-full lg:w-72 shrink-0 p-5 rounded-xl border border-white/5 bg-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400">Match Match Score</span>
                      <span className="text-xl font-black text-brand-400">{item.score} <span className="text-xs font-normal text-gray-400">pts</span></span>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-2 text-[10px] text-gray-400 border-t border-white/5 pt-3">
                      <div className="flex items-center justify-between">
                        <span>Skill Overlap & Prof.</span>
                        <span className="text-white font-medium">+{item.breakdown.skillScore}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Instructor Rating</span>
                        <span className="text-white font-medium">+{item.breakdown.ratingScore}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Time Availability Overlap</span>
                        <span className="text-white font-medium">+{item.breakdown.availabilityScore}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Mutual Swap Boost</span>
                        <span className="text-white font-medium">+{item.breakdown.mutualMatchBoost}</span>
                      </div>
                      {item.breakdown.motivationBoost > 0 && (
                        <div className="flex items-center justify-between text-yellow-450">
                          <span>Teacher Motivation Boost</span>
                          <span className="font-medium">+{item.breakdown.motivationBoost}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={status === 'sent' || status === 'sending'}
                    onClick={() => handleConnect(item.user._id)}
                    className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      status === 'sent'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                        : status === 'sending'
                        ? 'bg-white/5 text-gray-400 cursor-wait'
                        : 'bg-brand-600 hover:bg-brand-700 text-white active:scale-95 shadow-md shadow-brand-500/10'
                    }`}
                  >
                    {status === 'sent' ? (
                      <span className="flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Request Sent
                      </span>
                    ) : status === 'sending' ? (
                      'Sending...'
                    ) : (
                      'Propose Connection'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default Suggestions;
