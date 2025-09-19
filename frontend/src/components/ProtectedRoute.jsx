import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Laden...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="alert alert-error">
            <h3>Toegang Geweigerd</h3>
            <p>Je hebt geen toegang tot deze pagina.</p>
            <a href="/dashboard" className="btn btn-primary">
              Terug naar Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;