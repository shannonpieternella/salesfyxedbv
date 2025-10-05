import { useState } from 'react';
import axios from 'axios';

const PasswordChange = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Nieuwe wachtwoorden komen niet overeen');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Nieuw wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      await axios.put(`${baseURL}/api/auth/change-password`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Wachtwoord succesvol gewijzigd!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setError(error.response?.data?.error || 'Fout bij wijzigen wachtwoord');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '8px',
        color: 'var(--cyber-text)'
      }}>
        🔒 Wachtwoord Wijzigen
      </h2>
      <p style={{
        color: 'var(--cyber-text-muted)',
        fontSize: '14px',
        marginBottom: '24px'
      }}>
        Wijzig je wachtwoord voor extra beveiliging
      </p>

      {success && (
        <div style={{
          padding: '16px',
          marginBottom: '24px',
          background: 'rgba(0, 255, 163, 0.1)',
          border: '1px solid rgba(0, 255, 163, 0.3)',
          borderRadius: '8px',
          color: 'var(--neon-green)'
        }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px',
          marginBottom: '24px',
          background: 'rgba(244, 113, 181, 0.1)',
          border: '1px solid rgba(244, 113, 181, 0.3)',
          borderRadius: '8px',
          color: 'var(--neon-pink)'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--cyber-text)'
          }}>
            Huidig Wachtwoord
          </label>
          <input
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            required
            className="form-control"
            placeholder="••••••••"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--cyber-text)'
          }}>
            Nieuw Wachtwoord
          </label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            required
            className="form-control"
            placeholder="••••••••"
            minLength={6}
          />
          <small style={{ color: 'var(--cyber-text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            Minimaal 6 karakters
          </small>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--cyber-text)'
          }}>
            Bevestig Nieuw Wachtwoord
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            className="form-control"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {loading ? 'Wijzigen...' : 'Wachtwoord Wijzigen'}
        </button>
      </form>
    </div>
  );
};

export default PasswordChange;
