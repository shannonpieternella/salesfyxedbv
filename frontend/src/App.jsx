import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Playbook from './pages/Playbook';
import AnalyticsSteps from './pages/AnalyticsSteps';
import './styles/globals.css';
import './styles/futuristic.css';

const AppContent = () => {
  const { user } = useAuth();

  return (
    <Router>
      <div className="app">
        {user && <Navbar />}

        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" /> : <Login />}
          />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/companies" element={
            <ProtectedRoute>
              <Companies />
            </ProtectedRoute>
          } />

          <Route path="/companies/:id" element={
            <ProtectedRoute>
              <CompanyDetail />
            </ProtectedRoute>
          } />

          <Route path="/playbook" element={
            <ProtectedRoute>
              <Playbook />
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute>
              <AnalyticsSteps />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={
            <div className="dashboard">
              <div className="dashboard-content">
                <div className="card text-center">
                  <h2>404 - Pagina niet gevonden</h2>
                  <p>De pagina die je zoekt bestaat niet.</p>
                  <a href="/dashboard" className="btn btn-primary">Back to Dashboard</a>
                </div>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
