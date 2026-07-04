import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen, Compass, Users, Calendar, Coins, User } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
      isActive(path)
        ? 'bg-brand-500 text-[#060b13] shadow-md shadow-brand-500/10'
        : 'text-gray-300 hover:text-white hover:bg-white/5'
    }`;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#060b13]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-brand-300 via-brand-500 to-accent-500 bg-clip-text text-transparent animate-pulse" style={{ animationDuration: '4s' }}>
              SkillSwap
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/browse" className={navLinkClass('/browse')}>
              <Compass className="w-4 h-4" />
              Browse Skills
            </Link>
            <Link to="/suggestions" className={navLinkClass('/suggestions')}>
              <Users className="w-4 h-4" />
              Suggestions
            </Link>
            <Link to="/sessions" className={navLinkClass('/sessions')}>
              <Calendar className="w-4 h-4" />
              My Sessions
            </Link>
            <Link to="/ledger" className={navLinkClass('/ledger')}>
              <Coins className="w-4 h-4" />
              History & Ledger
            </Link>
            <Link to="/profile" className={navLinkClass('/profile')}>
              <User className="w-4 h-4" />
              My Profile
            </Link>
          </div>

          {/* Credit balance & user profile actions */}
          <div className="flex items-center gap-4">
            {/* Live Credit Balance */}
            <Link 
              to="/ledger" 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all shadow-sm"
              title="Your Credit Balance"
            >
              <Coins className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
              <span className="text-sm font-semibold tracking-wide">
                {user.creditBalance} {user.creditBalance === 1 ? 'Credit' : 'Credits'}
              </span>
            </Link>

            {/* User Greeting */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{user.name}</span>
              <span className="text-[10px] text-gray-400">★ {user.averageRating ? user.averageRating.toFixed(1) : 'No reviews'}</span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2 rounded-lg border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
