import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/auth';
import { SignIn } from './components/signin';
import { ProtectedRoute } from './components/protected-route';
import { Sidebar } from './components/sidebar';
import { Dashboard } from './components/dashboard';
import { MyResumes } from './components/my-resumes';
import { Settings } from './components/settings';
import './App.css';

// Main layout component
function MainLayout() {
  const [currentPage, setCurrentPage] = React.useState('Dashboard');
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'My Resumes':
        return <MyResumes />;
      case 'Settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="dark flex h-screen bg-gray-950 text-white">
      <Sidebar onNavigate={setCurrentPage} currentPage={currentPage} />
      <main className="flex-1 overflow-auto ml-64">
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route
            path="/signin"
            element={<SignIn />}
          />
          <Route
            path="/*"
            element={<MainLayout />}
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
