import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/ToastContainer';

// Import Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { Browse } from './pages/Browse';
import { Suggestions } from './pages/Suggestions';
import { Sessions } from './pages/Sessions';
import { Chat } from './pages/Chat';
import { Ledger } from './pages/Ledger';

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e0a16]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Root redirect checker
const RootRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e0a16]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to="/browse" replace /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen flex flex-col bg-[#090514] text-[#e2e0e7] antialiased relative overflow-hidden font-sans">
            {/* Ambient Background Glow Blobs */}
            <div className="absolute top-[-10%] left-[-15%] w-[50vw] h-[50vw] rounded-full bg-brand-500/10 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-accent-500/5 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
            <div className="absolute top-[35%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-brand-600/5 blur-[120px] pointer-events-none" />
            
            {/* Global Navbar */}
            <Navbar />
            
            {/* Main view area */}
            <main className="flex-1 relative z-10">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/browse"
                  element={
                    <ProtectedRoute>
                      <Browse />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/suggestions"
                  element={
                    <ProtectedRoute>
                      <Suggestions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sessions"
                  element={
                    <ProtectedRoute>
                      <Sessions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ledger"
                  element={
                    <ProtectedRoute>
                      <Ledger />
                    </ProtectedRoute>
                  }
                />

                {/* Fallbacks */}
                <Route path="/" element={<RootRoute />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Global real-time Toast manager */}
            <ToastContainer />
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
