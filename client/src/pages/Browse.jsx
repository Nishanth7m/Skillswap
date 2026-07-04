import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Compass, GraduationCap, Star, ArrowRight, UserPlus, Check, X, ShieldAlert } from 'lucide-react';

export const Browse = () => {
  const [skills, setSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Instructor Modal States
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [pendingRequests, setPendingRequests] = useState({}); // recipientId -> boolean/status

  // Load skills initially and when filters change
  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.q = searchQuery;

      const res = await axios.get('/api/skills', { params });
      if (res.data?.success) {
        setSkills(res.data.data);
        if (categories.length === 0) {
          setCategories(res.data.categories);
        }
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSkills();
  };

  // Open instructor modal for a skill
  const handleOpenTeachers = async (skill) => {
    setSelectedSkill(skill);
    setLoadingTeachers(true);
    setTeachers([]);
    
    try {
      const res = await axios.get(`/api/skills/${skill._id}/teachers`);
      if (res.data?.success) {
        setTeachers(res.data.data);
      }
    } catch (err) {
      console.error('Error loading instructors:', err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  // Request a connection (Match request)
  const handleConnect = async (teacherId) => {
    try {
      setPendingRequests(prev => ({ ...prev, [teacherId]: 'sending' }));
      const res = await axios.post('/api/matches/request', { recipientId: teacherId });
      
      if (res.data?.success) {
        setPendingRequests(prev => ({ ...prev, [teacherId]: 'sent' }));
      }
    } catch (err) {
      console.error('Connection request failed:', err);
      alert(err.response?.data?.message || 'Failed to send match request');
      setPendingRequests(prev => ({ ...prev, [teacherId]: null }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Discover New Skills
        </h2>
        <p className="mt-3 text-lg text-gray-400">
          Search and browse through barter offers. Connect with other users to exchange teaching hours.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              placeholder="Search e.g. React, Spanish, Photography..."
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors"
          >
            Search
          </button>
        </form>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              selectedCategory === ''
                ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-500/10'
                : 'border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-500/10'
                  : 'border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border glass opacity-50" />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-12 border border-white/5 rounded-2xl glass">
          <Compass className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Skills Found</h3>
          <p className="text-sm text-gray-400">Try broadening your search query or selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <div
              key={skill._id}
              onClick={() => handleOpenTeachers(skill)}
              className="p-6 rounded-2xl border glass glass-hover cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                  {skill.category}
                </span>
                <h3 className="text-lg font-bold text-white mt-3 group-hover:text-brand-300 transition-colors">
                  {skill.name}
                </h3>
                <p className="text-xs text-gray-450 mt-2 line-clamp-2">
                  {skill.description}
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-brand-300 mt-6 group-hover:translate-x-1 transition-transform">
                Find instructors
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructor Lookup Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="max-w-2xl w-full rounded-2xl border glass bg-[#130f1e] shadow-2xl relative flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">
                  {selectedSkill.category}
                </span>
                <h3 className="text-xl font-bold text-white mt-2">
                  Instructors for {selectedSkill.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingTeachers ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-24 rounded-xl border glass opacity-55" />
                  ))}
                </div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-white">No Tutors Yet</h4>
                  <p className="text-xs text-gray-400 mt-1">Be the first to list this skill in your profile!</p>
                </div>
              ) : (
                teachers.map((t) => {
                  const status = pendingRequests[t._id];
                  const bioSnippet = t.bio || 'This user hasn\'t added a biography yet.';
                  
                  return (
                    <div key={t._id} className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex gap-3">
                        <img
                          src={t.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${t.name}`}
                          alt={t.name}
                          className="w-11 h-11 rounded-full border border-white/10 shrink-0 bg-brand-card object-cover"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            {t.name}
                            <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-0.5 ml-1">
                              <Star className="w-3 h-3 fill-yellow-400" />
                              {t.averageRating ? t.averageRating.toFixed(1) : 'New'}
                            </span>
                          </h4>
                          <p className="text-xs text-gray-450 mt-1 line-clamp-2">{bioSnippet}</p>
                        </div>
                      </div>

                      <button
                        disabled={status === 'sent' || status === 'sending'}
                        onClick={() => handleConnect(t._id)}
                        className={`sm:shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          status === 'sent'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                            : status === 'sending'
                            ? 'bg-white/5 text-gray-400 cursor-wait'
                            : 'bg-brand-600 hover:bg-brand-700 text-white active:scale-95 shadow-md shadow-brand-500/10'
                        }`}
                      >
                        {status === 'sent' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Requested
                          </>
                        ) : status === 'sending' ? (
                          'Sending...'
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Connect
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
