import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './components/Dashboard';
import ModernDashboard from './components/ModernDashboard';
import Sales from './pages/Sales.jsx';
import Team from './pages/Team.jsx';
import MyTeam from './pages/MyTeam.jsx';
import Earnings from './pages/Earnings.jsx';
import Invoices from './pages/Invoices.jsx';
import Admin from './pages/Admin.jsx';
import Payouts from './pages/Payouts.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Hierarchy from './pages/Hierarchy.jsx';
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
              <ModernDashboard />
            </ProtectedRoute>
          } />

          <Route path="/sales" element={
            <ProtectedRoute>
              <Sales />
            </ProtectedRoute>
          } />

          <Route path="/earnings" element={
            <ProtectedRoute>
              <Earnings />
            </ProtectedRoute>
          } />

          <Route path="/invoices" element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          } />

          <Route path="/team" element={
            <ProtectedRoute>
              <MyTeam />
            </ProtectedRoute>
          } />

          <Route path="/team-old" element={
            <ProtectedRoute requiredRoles={['leader', 'owner']}>
              <Team />
            </ProtectedRoute>
          } />

          <Route path="/payouts" element={
            <ProtectedRoute requiredRoles={['owner']}>
              <Payouts />
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute requiredRoles={['owner', 'leader']}>
              <UserManagement />
            </ProtectedRoute>
          } />

          <Route path="/hierarchy" element={
            <ProtectedRoute requiredRoles={['owner', 'leader']}>
              <Hierarchy />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute requiredRoles={['owner']}>
              <Admin />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={
            <div className="dashboard">
              <div className="dashboard-content">
                <div className="card text-center">
                  <h2>404 - Pagina niet gevonden</h2>
                  <p>De pagina die je zoekt bestaat niet.</p>
                  <a href="/dashboard" className="btn btn-primary">Terug naar Dashboard</a>
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