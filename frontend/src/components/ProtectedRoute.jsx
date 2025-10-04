import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0) {
    const role = (user.role || '').toLowerCase();
    const effective = role === 'owner' ? 'admin' : role === 'leader' ? 'agent' : role;
    const allowed = new Set(requiredRoles.map(r => String(r).toLowerCase()));
    if (allowed.has('admin')) allowed.add('owner');
    if (allowed.has('agent')) allowed.add('leader');

    if (!allowed.has(role) && !allowed.has(effective)) {
      return (
        <div className="dashboard">
          <div className="container">
            <div className="alert alert-error">
              <h3>Access Denied</h3>
              <p>You do not have access to this page.</p>
              <a href="/dashboard" className="btn btn-primary">
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
