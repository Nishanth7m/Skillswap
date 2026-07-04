import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Save, Plus, Trash2, Calendar, BookOpen, GraduationCap, Clock, Check, AlertCircle } from 'lucide-react';

const presetAvatars = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Midnight',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Rocky'
];

export const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [globalSkills, setGlobalSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'teach', 'learn'

  // Form states
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [skillsToTeach, setSkillsToTeach] = useState([]);
  const [skillsToLearn, setSkillsToLearn] = useState([]);
  const [timezone, setTimezone] = useState('UTC');
  const [slots, setSlots] = useState([]);

  // Input states for adding new items
  const [newTeachSkill, setNewTeachSkill] = useState('');
  const [newTeachProficiency, setNewTeachProficiency] = useState('Intermediate');
  const [newTeachDesc, setNewTeachDesc] = useState('');

  const [newLearnSkill, setNewLearnSkill] = useState('');
  const [newLearnLevel, setNewLearnLevel] = useState('Beginner');

  const [newSlotDay, setNewSlotDay] = useState('Monday');
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('10:00');

  // Status states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch global skills list for selectors
    const fetchSkills = async () => {
      try {
        const res = await axios.get('/api/skills');
        if (res.data?.success) {
          setGlobalSkills(res.data.data);
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error('Failed to load skills:', err);
      }
    };
    fetchSkills();
  }, []);

  // Initialize form fields once user context is loaded
  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
      setTimezone(user.availability?.timezone || 'UTC');
      setSlots(user.availability?.slots || []);
      
      // Unpack populated skill arrays into simple local states
      setSkillsToTeach(user.skillsToTeach.map(t => ({
        skill: t.skill?._id || t.skill,
        name: t.skill?.name || '',
        proficiency: t.proficiency,
        description: t.description || ''
      })));
      setSkillsToLearn(user.skillsToLearn.map(l => ({
        skill: l.skill?._id || l.skill,
        name: l.skill?.name || '',
        desiredLevel: l.desiredLevel
      })));
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    setSaving(true);

    try {
      const payload = {
        bio,
        avatar,
        skillsToTeach: skillsToTeach.map(s => ({
          skill: s.skill,
          proficiency: s.proficiency,
          description: s.description
        })),
        skillsToLearn: skillsToLearn.map(s => ({
          skill: s.skill,
          desiredLevel: s.desiredLevel
        })),
        availability: {
          timezone,
          slots
        }
      };

      const res = await updateProfile(payload);
      if (res?.success) {
        setSuccessMsg('Profile updated successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Add a Teachable Skill
  const handleAddTeachSkill = () => {
    if (!newTeachSkill) return;
    const selected = globalSkills.find(s => s._id === newTeachSkill);
    if (!selected) return;

    if (skillsToTeach.some(s => s.skill === newTeachSkill)) {
      alert('You have already added this skill');
      return;
    }

    setSkillsToTeach(prev => [...prev, {
      skill: newTeachSkill,
      name: selected.name,
      proficiency: newTeachProficiency,
      description: newTeachDesc
    }]);

    setNewTeachSkill('');
    setNewTeachDesc('');
  };

  // Remove a Teachable Skill
  const handleRemoveTeachSkill = (skillId) => {
    setSkillsToTeach(prev => prev.filter(s => s.skill !== skillId));
  };

  // Add a Learnable Skill
  const handleAddLearnSkill = () => {
    if (!newLearnSkill) return;
    const selected = globalSkills.find(s => s._id === newLearnSkill);
    if (!selected) return;

    if (skillsToLearn.some(s => s.skill === newLearnSkill)) {
      alert('You have already added this skill');
      return;
    }

    setSkillsToLearn(prev => [...prev, {
      skill: newLearnSkill,
      name: selected.name,
      desiredLevel: newLearnLevel
    }]);

    setNewLearnSkill('');
  };

  // Remove a Learnable Skill
  const handleRemoveLearnSkill = (skillId) => {
    setSkillsToLearn(prev => prev.filter(s => s.skill !== skillId));
  };

  // Add Availability Slot
  const handleAddSlot = () => {
    // Basic time validation
    if (newSlotStart >= newSlotEnd) {
      alert('Start time must be before end time');
      return;
    }

    // Check duplicates
    const isDuplicate = slots.some(s => 
      s.day === newSlotDay && 
      s.startTime === newSlotStart && 
      s.endTime === newSlotEnd
    );

    if (isDuplicate) {
      alert('This slot already exists');
      return;
    }

    setSlots(prev => [...prev, {
      day: newSlotDay,
      startTime: newSlotStart,
      endTime: newSlotEnd
    }].sort((a, b) => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      if (a.day !== b.day) return days.indexOf(a.day) - days.indexOf(b.day);
      return a.startTime.localeCompare(b.startTime);
    }));
  };

  // Remove Availability Slot
  const handleRemoveSlot = (index) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Alert Banners */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2 p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-400">
          <Check className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 p-4 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Side: Tabs Panel */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
              activeTab === 'info'
                ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                : 'border-white/5 text-gray-300 hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Bio & Availability
          </button>
          <button
            onClick={() => setActiveTab('teach')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
              activeTab === 'teach'
                ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                : 'border-white/5 text-gray-300 hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Skills to Teach
          </button>
          <button
            onClick={() => setActiveTab('learn')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
              activeTab === 'learn'
                ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                : 'border-white/5 text-gray-300 hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Skills to Learn
          </button>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="mt-6 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Right Side: Tab Contents */}
        <div className="flex-1 p-6 sm:p-8 rounded-2xl border glass shadow-xl">
          {/* TAB 1: Bio & Availability */}
          {activeTab === 'info' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Profile Information</h3>
                <p className="text-sm text-gray-400">Share details about yourself and configure your time-zone availability</p>
              </div>

              {/* Bio & Avatar */}
              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                      Select Profile Avatar Preset
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                      {presetAvatars.map((url, idx) => {
                        const isSelected = avatar === url;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAvatar(url)}
                            className={`relative p-1 rounded-full border-2 transition-all outline-none ${
                              isSelected
                                ? 'border-brand-500 shadow-[0_0_12px_rgba(139,92,246,0.5)] bg-brand-500/10 scale-105'
                                : 'border-white/5 bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <img
                              src={url}
                              alt={`Avatar ${idx}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Or Paste a Custom Image URL
                    </label>
                    <input
                      type="text"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="block w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                      placeholder="https://images.unsplash.com/photo-..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Biography (Bio)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="block w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    placeholder="Tell other swappers about your experience, background, and what makes you a great partner..."
                  />
                </div>
              </div>

              {/* Timezone Selector */}
              <div className="border-t border-white/5 pt-6">
                <h4 className="text-lg font-bold text-white mb-2">Weekly Availability Picker</h4>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="block w-full max-w-xs px-3 py-2 rounded-xl border border-white/10 bg-brand-card text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  >
                    <option value="UTC">UTC (GMT)</option>
                    <option value="America/New_York">EST (Eastern Time)</option>
                    <option value="America/Chicago">CST (Central Time)</option>
                    <option value="America/Los_Angeles">PST (Pacific Time)</option>
                    <option value="Europe/London">GMT/BST (London)</option>
                    <option value="Asia/Kolkata">IST (India Standard Time)</option>
                    <option value="Asia/Tokyo">JST (Tokyo)</option>
                  </select>
                </div>

                {/* Add Availability Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end p-4 rounded-xl border border-white/5 bg-white/5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Day</label>
                    <select
                      value={newSlotDay}
                      onChange={(e) => setNewSlotDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={newSlotStart}
                      onChange={(e) => setNewSlotStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={newSlotEnd}
                      onChange={(e) => setNewSlotEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg font-semibold text-xs text-white bg-brand-650 hover:bg-brand-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Slot
                  </button>
                </div>

                {/* Display Current Slots */}
                <div className="mt-6 space-y-2">
                  <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Time Slots</h5>
                  {slots.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No availability slots added yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {slots.map((slot, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/5">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-brand-400" />
                            <span className="text-xs text-white font-medium">{slot.day}</span>
                            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(i)}
                            className="text-gray-400 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Skills to Teach */}
          {activeTab === 'teach' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Skills You Can TEACH</h3>
                <p className="text-sm text-gray-400">List the skills you can offer to others. Be descriptive to boost matching scores!</p>
              </div>

              {/* Add Teach Skill */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Select Skill</label>
                    <select
                      value={newTeachSkill}
                      onChange={(e) => setNewTeachSkill(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">-- Choose Skill --</option>
                      {globalSkills.map(s => (
                        <option key={s._id} value={s._id}>{s.name} ({s.category})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Proficiency Level</label>
                    <select
                      value={newTeachProficiency}
                      onChange={(e) => setNewTeachProficiency(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Expert">Expert (Adds most weight)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Custom Description of What You Can Teach</label>
                  <input
                    type="text"
                    value={newTeachDesc}
                    onChange={(e) => setNewTeachDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                    placeholder="e.g. Can teach React Hooks, Tailwind layouts, and setting up MERN stacks..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddTeachSkill}
                  disabled={!newTeachSkill}
                  className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg font-semibold text-xs text-white bg-brand-650 hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Teachable Skill
                </button>
              </div>

              {/* Teachable list */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Teachable Skills</h5>
                {skillsToTeach.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No skills listed to teach yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {skillsToTeach.map((s, i) => (
                      <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/5 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{s.name}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              s.proficiency === 'Expert' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              s.proficiency === 'Intermediate' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {s.proficiency}
                            </span>
                          </div>
                          {s.description && (
                            <p className="text-xs text-gray-400 mt-1">{s.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeachSkill(s.skill)}
                          className="text-gray-400 hover:text-red-400 p-1 mt-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Skills to Learn */}
          {activeTab === 'learn' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Skills You Want to LEARN</h3>
                <p className="text-sm text-gray-400">List what you want to learn so the matching engine can find suitable tutors!</p>
              </div>

              {/* Add Learn Skill */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Select Skill</label>
                  <select
                    value={newLearnSkill}
                    onChange={(e) => setNewLearnSkill(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">-- Choose Skill --</option>
                    {globalSkills.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.category})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Desired Skill Level</label>
                  <select
                    value={newLearnLevel}
                    onChange={(e) => setNewLearnLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-brand-card text-white text-xs focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddLearnSkill}
                    disabled={!newLearnSkill}
                    className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg font-semibold text-xs text-white bg-brand-650 hover:bg-brand-600 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Learnable Skill
                  </button>
                </div>
              </div>

              {/* Learnable list */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Desired Skills</h5>
                {skillsToLearn.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No skills listed to learn yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {skillsToLearn.map((s, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-white">{s.name}</h4>
                          <span className="text-[10px] text-brand-350">Wants: {s.desiredLevel}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLearnSkill(s.skill)}
                          className="text-gray-400 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
