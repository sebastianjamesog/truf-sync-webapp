import React, { useState } from 'react';
import { HashRouter } from 'react-router-dom';
import MobileBooking from './components/MobileBooking';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';

interface UserSession {
  email: string;
  name: string;
  role: string;
  managedTurfId?: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('user_session');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData: UserSession) => {
    console.log("Logged in user:", userData);
    if (!userData.email) {
      alert("Login Warning: Email is missing in user data!");
    }
    setUser(userData);
    localStorage.setItem('user_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user_session');
  };

  const renderView = () => {
    // Strict check: User must be defined AND have an email
    if (!user || !user.email) {
      if (user && !user.email) {
        console.warn("User object exists but email is missing. Forcing logout.");
        handleLogout(); // Auto-cleanup invalid session
        return <LoginScreen onLogin={handleLogin} />;
      }
      return <LoginScreen onLogin={handleLogin} />;
    }

    switch (user.role) {
      case 'admin':
        return <AdminDashboard onLogout={handleLogout} />;
      case 'staff':
        return <StaffDashboard onLogout={handleLogout} turfId={user.managedTurfId || ''} />;
      case 'player':
      default:
        // Pass user prop to MobileBooking
        return <MobileBooking
          user={user}
          onLogout={handleLogout}
          onUpdateUser={(updatedUser) => {
            setUser(updatedUser);
            localStorage.setItem('user_session', JSON.stringify(updatedUser));
          }}
        />;
    }
  };

  return (
    <HashRouter>
      {renderView()}
    </HashRouter>
  );
};

export default App;