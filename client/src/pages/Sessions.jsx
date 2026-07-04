import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, BookOpen, User, Star, Plus, Check, X, ShieldAlert, CheckCircle, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Sessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('upcoming'); // 'upcoming', 'pending', 'history', 'propose'

  // Propose Session Form States
  const [selectedMatch, setSelectedMatch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [propDate, setPropDate] = useState('');
  const [propStart, setPropStart] = useState('09:00');
  const [propEnd, setPropEnd] = useState('10:00');
  const [matchTeachableSkills, setMatchTeachableSkills] = useState([]);

  // Review Modal States
  const [reviewingSession, setReviewingSession] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Status/Error
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user sessions
      const sessRes = await axios.get('/api/sessions');
      if (sessRes.data?.success) {
        setSessions(sessRes.data.data);
      }

      // 2. Fetch matches (for Propose Session dropdown)
      const matchesRes = await axios.get('/api/matches');
      if (matchesRes.data?.success) {
        // Only accepted matches can propose sessions
        setMatches(matchesRes.data.data.filter(m => m.status === 'ACCEPTED'));
      }
    } catch (err) {
      console.error('Failed to load sessions page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update teachable skills dropdown when match changes in Proposal Form
  useEffect(() => {
    if (!selectedMatch) {
      setMatchTeachableSkills([]);
      return;
    }

    const matchObj = matches.find(m => m._id === selectedMatch);
    if (!matchObj) return;

    // The partner could be requester or recipient. Get their details.
    const isRequester = user._id === matchObj.requester._id;
    const partner = isRequester ? matchObj.recipient : matchObj.requester;

    // Both user A and user B can teach. Provide skills taught by either user!
    // Since either A can teach B or B can teach A, let's gather skills taught by BOTH
    // but label them clearly so the proposer selects the correct tutor.
    const partnerTeaches = partner.skillsToTeach.map(s => ({
      id: s.skill?._id || s.skill,
      name: s.skill?.name || s.name,
      teacherName: partner.name,
      teacherId: partner._id
    }));

    const userTeaches = user.skillsToTeach.map(s => ({
      id: s.skill?._id || s.skill,
      name: s.skill?.name || s.name,
      teacherName: user.name,
      teacherId: user._id
    }));

    setMatchTeachableSkills([...partnerTeaches, ...userTeaches]);
    if (partnerTeaches.length > 0) {
      setSelectedSkill(partnerTeaches[0].id);
    } else if (userTeaches.length > 0) {
      setSelectedSkill(userTeaches[0].id);
    }
  }, [selectedMatch, matches, user]);

  const handlePropose = async (e) => {
    e.preventDefault();
    setFormSuccess('');
    setFormError('');

    if (!selectedMatch || !selectedSkill || !propDate) {
      setFormError('Please fill out all fields');
      return;
    }

    try {
      const payload = {
        matchId: selectedMatch,
        skillId: selectedSkill,
        proposedTime: {
          date: propDate,
          startTime: propStart,
          endTime: propEnd
        }
      };

      const res = await axios.post('/api/sessions/propose', payload);
      if (res.data?.success) {
        setFormSuccess('Session proposal sent successfully!');
        setSelectedMatch('');
        setPropDate('');
        fetchData();
        setTimeout(() => {
          setActiveSubTab('pending');
          setFormSuccess('');
        }, 2000);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to propose session');
    }
  };

  const handleAccept = async (sessionId) => {
    try {
      const res = await axios.put(`/api/sessions/${sessionId}/accept`);
      if (res.data?.success) {
        fetchData();
        alert('Session confirmed and 1 credit reserved from learner balance.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Acceptance failed');
    }
  };

  const handleDecline = async (sessionId) => {
    if (!window.confirm('Are you sure you want to decline this proposal?')) return;
    try {
      const res = await axios.put(`/api/sessions/${sessionId}/decline`);
      if (res.data?.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Decline failed');
    }
  };

  const handleCancel = async (sessionId) => {
    if (!window.confirm('Cancel this session? Learner will be refunded.')) return;
    try {
      const res = await axios.put(`/api/sessions/${sessionId}/cancel`);
      if (res.data?.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const handleComplete = async (sessionId) => {
    if (!window.confirm('Mark this session completed? This transfers 1 credit to the teacher.')) return;
    try {
      const res = await axios.put(`/api/sessions/${sessionId}/complete`);
      if (res.data?.success) {
        fetchData();
        // Prompt for review
        setReviewingSession(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Completion failed');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await axios.post('/api/reviews', {
        sessionId: reviewingSession._id,
        rating,
        comment
      });
      if (res.data?.success) {
        alert('Review submitted successfully!');
        setReviewingSession(null);
        setRating(5);
        setComment('');
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filter lists based on sub-tab
  const upcomingSessions = sessions.filter(s => s.status === 'CONFIRMED');
  const pendingProposals = sessions.filter(s => s.status === 'PENDING');
  const pastSessions = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'CANCELLED');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-8">
        <button
          onClick={() => setActiveSubTab('upcoming')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeSubTab === 'upcoming'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Upcoming ({upcomingSessions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeSubTab === 'pending'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Pending Proposals ({pendingProposals.length})
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeSubTab === 'history'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          History ({pastSessions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('propose')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'propose'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Propose Session
        </button>
      </div>

      {/* Render Sub Tabs */}
      {loading && activeSubTab !== 'propose' ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 rounded-2xl border glass opacity-55" />
          <div className="h-28 rounded-2xl border glass opacity-55" />
        </div>
      ) : (
        <>
          {/* TAB 1: Upcoming Sessions */}
          {activeSubTab === 'upcoming' && (
            upcomingSessions.length === 0 ? (
              <div className="text-center py-16 border border-white/5 rounded-2xl glass">
                <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Confirmed Sessions</h3>
                <p className="text-sm text-gray-400">Propose a time to your matches, or wait for them to accept yours.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((s) => {
                  const isTeacher = user._id === s.teacher._id;
                  const partner = isTeacher ? s.learner : s.teacher;
                  return (
                    <div key={s._id} className="p-6 rounded-2xl border glass flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex gap-4 items-start">
                        <img
                          src={partner.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${partner.name}`}
                          alt={partner.name}
                          className="w-12 h-12 rounded-full border border-white/10 shrink-0 object-cover bg-brand-card"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs uppercase font-bold tracking-wider text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                              {s.skill.name}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {isTeacher ? 'You are TEACHING' : 'You are LEARNING'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-1.5">With {partner.name}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-450 mt-2">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-brand-350" /> {new Date(s.proposedTime.date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-brand-350" /> {s.proposedTime.startTime} - {s.proposedTime.endTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleComplete(s._id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => handleCancel(s._id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold border border-red-500/20 bg-red-950/20 hover:bg-red-900/40 text-red-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: Pending Proposals */}
          {activeSubTab === 'pending' && (
            pendingProposals.length === 0 ? (
              <div className="text-center py-16 border border-white/5 rounded-2xl glass">
                <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Pending Proposals</h3>
                <p className="text-sm text-gray-400">Proposals waiting for action from you or your partner will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingProposals.map((s) => {
                  const isTeacher = user._id === s.teacher;
                  const partner = isTeacher ? s.learner : s.teacher;
                  // If s.learner._id exists, it means populated, check id directly.
                  // For safety, let's look up partner details
                  const partnerName = partner.name || 'Your Partner';
                  const partnerAvatar = partner.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${partnerName}`;

                  // Learner needs to accept/decline. Wait, actually, the recipient of the proposal (which could be teacher or learner) accepts.
                  // For simplicity: either A proposed it, B accepts.
                  // We check: is acceptor learner? If learner, acceptor pays. So learner must verify they have credit.
                  // If they are acceptor, we show Accept/Decline.
                  // To check who is acceptor:
                  // The proposer sends the proposal. If they are learner, they want to book. If they are teacher, they want to offer.
                  // Let's assume BOTH can accept/decline the proposed slot. But if learner accepts, they verify credit.
                  // Let's show Accept and Decline buttons to the user if they did NOT propose it.
                  // We didn't save "proposedBy" in schema, but we can allow either user to accept (accepting creates confirmed session).
                  // If a user clicks "Accept", it confirms. If they proposed it, they can also cancel it.
                  return (
                    <div key={s._id} className="p-6 rounded-2xl border glass flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex gap-4 items-start">
                        <div className="p-3 rounded-full bg-white/5 text-brand-400">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase font-bold tracking-wider text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                              {s.skill?.name || 'Skill offer'}
                            </span>
                            <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded font-semibold border border-yellow-500/20">
                              1 Credit Cost
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-450 mt-3">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(s.proposedTime.date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.proposedTime.startTime} - {s.proposedTime.endTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleAccept(s._id)}
                          className="flex items-center justify-center p-2 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          <Check className="w-4 h-4 mr-1" /> Confirm
                        </button>
                        <button
                          onClick={() => handleDecline(s._id)}
                          className="flex items-center justify-center p-2 px-4 rounded-xl text-xs font-bold border border-red-500/20 bg-red-950/20 hover:bg-red-900/40 text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4 mr-1" /> Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 3: History */}
          {activeSubTab === 'history' && (
            pastSessions.length === 0 ? (
              <div className="text-center py-16 border border-white/5 rounded-2xl glass">
                <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Past Sessions</h3>
                <p className="text-sm text-gray-400">Your completed or cancelled sessions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastSessions.map((s) => {
                  const isTeacher = user._id === (s.teacher._id || s.teacher);
                  const partner = isTeacher ? s.learner : s.teacher;
                  const partnerName = partner.name || 'Swapper';
                  const isCompleted = s.status === 'COMPLETED';

                  return (
                    <div key={s._id} className="p-6 rounded-2xl border glass flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-75">
                      <div className="flex gap-4 items-start">
                        <div className={`p-2.5 rounded-full ${
                          isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {isCompleted ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {s.skill?.name || 'Skill Exchange'}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {s.status}
                            </span>
                          </div>
                          <h4 className="text-xs text-gray-400 mt-1">With {partnerName} • {isTeacher ? 'You taught' : 'You learned'}</h4>
                        </div>
                      </div>

                      {/* Review prompt if completed */}
                      {isCompleted && (
                        <button
                          onClick={() => setReviewingSession(s)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                        >
                          Write Review
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 4: Propose Session Form */}
          {activeSubTab === 'propose' && (
            <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-2xl border glass shadow-xl">
              <h3 className="text-xl font-bold text-white mb-2">Propose Skill Session</h3>
              <p className="text-xs text-gray-400 mb-6">Schedule a session with one of your connected match partners.</p>

              {formSuccess && (
                <div className="mb-4 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 text-xs font-semibold">
                  {formSuccess}
                </div>
              )}
              {formError && (
                <div className="mb-4 p-3.5 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {matches.length === 0 ? (
                <div className="text-center py-6">
                  <ShieldAlert className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-white">No Connected Matches</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    You can only propose sessions once you have accepted match connections. Go to <Link to="/suggestions" className="text-brand-400 font-bold hover:underline">Suggestions</Link> to connect.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePropose} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      1. Choose Connected Partner
                    </label>
                    <select
                      value={selectedMatch}
                      onChange={(e) => setSelectedMatch(e.target.value)}
                      required
                      className="block w-full px-3 py-2.5 rounded-xl border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">-- Select Partner --</option>
                      {matches.map(m => {
                        const partner = user._id === m.requester._id ? m.recipient : m.requester;
                        return (
                          <option key={m._id} value={m._id}>{partner.name} (Match Score: {m.score})</option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedMatch && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                        2. Select Skill & Tutor
                      </label>
                      <select
                        value={selectedSkill}
                        onChange={(e) => setSelectedSkill(e.target.value)}
                        required
                        className="block w-full px-3 py-2.5 rounded-xl border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                      >
                        {matchTeachableSkills.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Taught by: {s.teacherName})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                        3. Date
                      </label>
                      <input
                        type="date"
                        value={propDate}
                        onChange={(e) => setPropDate(e.target.value)}
                        required
                        className="block w-full px-3 py-2 rounded-xl border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={propStart}
                        onChange={(e) => setPropStart(e.target.value)}
                        required
                        className="block w-full px-3 py-2 rounded-xl border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={propEnd}
                        onChange={(e) => setPropEnd(e.target.value)}
                        required
                        className="block w-full px-3 py-2 rounded-xl border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 mt-6 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors text-sm shadow-md"
                  >
                    Send Session Proposal
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}

      {/* Review Dialog Modal */}
      {reviewingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full p-6 rounded-2xl border glass bg-[#130f1e] shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-1.5">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400/20" /> Leave a Review
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Rate your skill exchange session. Your feedback directly impacts future matching ranks!
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">Rating</label>
                <div className="flex gap-2 justify-center py-2 bg-white/5 border border-white/5 rounded-xl">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRating(val)}
                      className={`p-2 transition-transform transform active:scale-90 ${
                        val <= rating ? 'text-yellow-400' : 'text-gray-600'
                      }`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">Feedback Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 rounded-xl border border-white/10 bg-brand-card text-white focus:ring-1 focus:ring-brand-500 text-xs"
                  placeholder="Share what went well and what they taught you..."
                  required
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setReviewingSession(null)}
                  className="px-4 py-2 rounded-xl border border-white/5 text-gray-400 hover:text-white text-xs"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Sessions;
