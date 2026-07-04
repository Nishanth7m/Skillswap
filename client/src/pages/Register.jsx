import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await register(name, email, password);
      if (res?.success) {
        navigate('/profile'); // Send them to set up their skills first!
      } else {
        setError(res?.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Email already exists or password is too short');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 p-8 sm:p-10 rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#18112c]/80 to-[#0e0a16]/95 backdrop-blur-xl shadow-[0_0_80px_-15px_rgba(139,92,246,0.3)] relative overflow-hidden">
        {/* Neon top border line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
        
        {/* Glow overlay */}
        <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center relative z-10">
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-violet-300 via-fuchsia-350 to-indigo-300 bg-clip-text text-transparent">
            Get Started
          </h2>
          <p className="mt-2 text-xs text-gray-400">
            Create an account to join the peer-to-peer time exchange
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl border border-red-500/15 bg-red-950/20 text-red-400 text-xs relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6 relative z-10" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-white/5 bg-black/30 text-white placeholder-gray-550 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:bg-black/50 transition-all duration-300 text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-white/5 bg-black/30 text-white placeholder-gray-550 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:bg-black/50 transition-all duration-300 text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-white/5 bg-black/30 text-white placeholder-gray-550 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:bg-black/50 transition-all duration-300 text-sm"
                  placeholder="•••••••• (min 6 characters)"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-[#060b13] bg-gradient-to-r from-brand-500 to-brand-300 hover:from-brand-400 hover:to-brand-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all duration-300 shadow-[0_4px_20px_-3px_rgba(0,245,212,0.4)] hover:shadow-[0_4px_25px_0_rgba(0,245,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3.5">
                <UserPlus className="h-4 w-4 text-brand-200 group-hover:text-white transition-colors" />
              </span>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="text-center mt-6 relative z-10">
          <p className="text-xs text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
