import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import { adminAPI } from '../utils/api';

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'agent',
    phone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await axios.get(`${baseURL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(response.data.users);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await axios.post(`${baseURL}/api/users`, newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Gebruiker aangemaakt! Standaard wachtwoord: ${response.data.defaultPassword}`);
      setNewUser({ name: '', email: '', role: 'agent', phone: '' });
      setShowModal(false);
      fetchUsers();

      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError(error.response?.data?.error || 'Fout bij aanmaken gebruiker');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt deactiveren?')) return;

    try {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      await axios.delete(`${baseURL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Gebruiker gedeactiveerd');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Fout bij deactiveren gebruiker');
    }
  };

  const handleResetPassword = async (userId, userName, userEmail) => {
    if (!confirm(`Wachtwoord resetten voor ${userName} (${userEmail}) naar standaard wachtwoord 'newuser123'?`)) return;

    try {
      const response = await adminAPI.resetUserPassword(userId);
      const defaultPassword = response.data.defaultPassword || 'newuser123';
      setSuccess(`Wachtwoord gereset!\n\nInloggegevens voor ${userName}:\nEmail: ${userEmail}\nWachtwoord: ${defaultPassword}\n\nDeel deze gegevens met de gebruiker.`);
      setTimeout(() => setSuccess(''), 10000);
    } catch (error) {
      setError(error.response?.data?.error || 'Fout bij resetten wachtwoord');
      setTimeout(() => setError(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              👥 Gebruikers Beheer
            </h1>
            {(user?.role === 'owner' || user?.role === 'admin') && (
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                + Nieuwe Gebruiker
              </button>
            )}
          </div>
          <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
            Beheer gebruikers en hun toegang
          </p>
        </div>

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

        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cyber-border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--cyber-text)' }}>Naam</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--cyber-text)' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--cyber-text)' }}>Rol</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--cyber-text)' }}>Telefoon</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--cyber-text)' }}>Status</th>
                  {(user?.role === 'owner' || user?.role === 'admin') && (
                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--cyber-text)' }}>Acties</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((usr) => (
                  <tr key={usr._id} style={{ borderBottom: '1px solid var(--cyber-border)' }}>
                    <td style={{ padding: '12px', color: 'var(--cyber-text)' }}>{usr.name}</td>
                    <td style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>{usr.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        background: usr.role === 'owner' ? 'rgba(244, 113, 181, 0.2)' :
                                  usr.role === 'admin' ? 'rgba(123, 97, 255, 0.2)' :
                                  'rgba(75, 172, 254, 0.2)',
                        border: `1px solid ${usr.role === 'owner' ? 'var(--neon-pink)' :
                                            usr.role === 'admin' ? 'var(--neon-purple)' :
                                            'var(--neon-blue)'}`,
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        color: usr.role === 'owner' ? 'var(--neon-pink)' :
                              usr.role === 'admin' ? 'var(--neon-purple)' :
                              'var(--neon-blue)'
                      }}>
                        {usr.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>
                      {usr.phone || '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        background: usr.active ? 'rgba(0, 255, 163, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                        border: `1px solid ${usr.active ? 'var(--neon-green)' : '#6b7280'}`,
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: usr.active ? 'var(--neon-green)' : '#6b7280'
                      }}>
                        {usr.active ? 'ACTIEF' : 'INACTIEF'}
                      </span>
                    </td>
                    {(user?.role === 'owner' || user?.role === 'admin') && (
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {user?.role === 'owner' && (
                            <button
                              onClick={() => handleResetPassword(usr._id, usr.name, usr.email)}
                              style={{
                                padding: '6px 12px',
                                background: 'rgba(255, 193, 7, 0.1)',
                                border: '1px solid #ffc107',
                                borderRadius: '6px',
                                color: '#ffc107',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              🔑 Reset PW
                            </button>
                          )}
                          {usr._id !== user._id && (
                            <button
                              onClick={() => handleDeleteUser(usr._id)}
                              style={{
                                padding: '6px 12px',
                                background: 'rgba(244, 113, 181, 0.1)',
                                border: '1px solid var(--neon-pink)',
                                borderRadius: '6px',
                                color: 'var(--neon-pink)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Deactiveren
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal */}
        {showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div className="card" style={{
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '24px',
                color: 'var(--cyber-text)'
              }}>
                Nieuwe Gebruiker Aanmaken
              </h2>

              <form onSubmit={handleCreateUser}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--cyber-text)'
                  }}>
                    Naam *
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                    className="form-control"
                    placeholder="Volledige naam"
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
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                    className="form-control"
                    placeholder="email@example.com"
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
                    Rol *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    required
                    className="form-control"
                  >
                    <option value="agent">Agent</option>
                    <option value="leader">Leader</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--cyber-text)'
                  }}>
                    Telefoon
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="form-control"
                    placeholder="+31 6 12345678"
                  />
                </div>

                <div style={{
                  padding: '12px',
                  background: 'rgba(75, 172, 254, 0.1)',
                  border: '1px solid rgba(75, 172, 254, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  color: 'var(--cyber-text-muted)'
                }}>
                  <strong style={{ color: 'var(--neon-blue)' }}>ℹ️ Info:</strong> De gebruiker krijgt het standaard wachtwoord: <strong>newuser123</strong>
                  <br />
                  Ze kunnen dit wijzigen in hun dashboard.
                </div>

                {error && (
                  <div style={{
                    padding: '12px',
                    marginBottom: '16px',
                    background: 'rgba(244, 113, 181, 0.1)',
                    border: '1px solid rgba(244, 113, 181, 0.3)',
                    borderRadius: '8px',
                    color: 'var(--neon-pink)',
                    fontSize: '13px'
                  }}>
                    {error}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setError('');
                      setNewUser({ name: '', email: '', role: 'agent', phone: '' });
                    }}
                    className="btn"
                    style={{
                      background: 'var(--cyber-border)',
                      color: 'var(--cyber-text)'
                    }}
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Aanmaken
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
