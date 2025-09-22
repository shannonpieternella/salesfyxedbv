import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usersAPI } from '../utils/api';
import { formatDate, getRoleText } from '../utils/auth';
import Modal from '../components/Modal.jsx';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({ role: '', status: '' });

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'agent',
    sponsorId: '',
    canCreateTeams: false,
    phone: ''
  });

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUsers(filters);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.name || !newUser.email) {
      alert('Naam en email zijn vereist');
      return;
    }

    try {
      const userData = {
        ...newUser,
        sponsorId: newUser.sponsorId || null
      };

      const response = await usersAPI.createUser(userData);

      if (response.data.user) {
        setUsers(prev => [response.data.user, ...prev]);
        setShowModal(false);
        resetForm();

        // Show success message with default password
        const defaultPassword = response.data.defaultPassword || 'newuser123';
        alert(`Gebruiker succesvol aangemaakt!\n\nLogin gegevens:\nEmail: ${newUser.email}\nWachtwoord: ${defaultPassword}\n\nDe gebruiker kan dit wachtwoord wijzigen na inloggen.`);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Fout bij aanmaken gebruiker');
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      // Check if sponsor is changing
      const currentUser = users.find(u => u._id === userId);
      const isTransferring = currentUser?.sponsorId !== updates.sponsorId;

      if (isTransferring) {
        const confirmMessage = `Dit zal de gebruiker verplaatsen naar een nieuwe teamleader. Alle sales geschiedenis blijft behouden. Doorgaan?`;
        if (!confirm(confirmMessage)) return;
      }

      const response = await usersAPI.updateUser(userId, updates);
      // Refetch users to get updated sponsor data
      await fetchUsers();
      setShowModal(false);

      if (isTransferring) {
        alert('Gebruiker succesvol overgeplaatst! Alle sales data is behouden.');
      } else {
        alert('Gebruiker succesvol bijgewerkt!');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Fout bij bijwerken gebruiker');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) return;

    try {
      await usersAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
      alert('Gebruiker succesvol verwijderd!');
    } catch (error) {
      alert(error.response?.data?.error || 'Fout bij verwijderen gebruiker');
    }
  };

  const handleAssignSponsor = async (userId, sponsorId) => {
    try {
      await usersAPI.updateUser(userId, { sponsorId: sponsorId || null });
      setUsers(prev => prev.map(u =>
        u._id === userId ? { ...u, sponsorId: sponsorId || null } : u
      ));
      alert('Sponsor/Team Leader succesvol toegewezen!');
    } catch (error) {
      alert(error.response?.data?.error || 'Fout bij toewijzen sponsor');
    }
  };

  const resetForm = () => {
    setNewUser({
      name: '',
      email: '',
      role: 'agent',
      sponsorId: '',
      canCreateTeams: false,
      phone: ''
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'var(--neon-pink)';
      case 'leader': return 'var(--neon-purple)';
      case 'agent': return 'var(--neon-blue)';
      default: return 'var(--cyber-text-muted)';
    }
  };

  const getUserStatusBadge = (user) => {
    return user.isActive !== false ? 'success' : 'secondary';
  };

  const filteredUsers = users.filter(u => {
    if (filters.role && u.role !== filters.role) return false;
    if (filters.status === 'active' && u.isActive === false) return false;
    if (filters.status === 'inactive' && u.isActive !== false) return false;
    return true;
  });

  // Get potential sponsors (owners and leaders)
  const potentialSponsors = users.filter(u => ['owner', 'leader'].includes(u.role));

  if (user?.role !== 'owner' && user?.role !== 'leader') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cyber-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cyber-card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
          <h2 style={{ color: 'var(--neon-pink)', marginBottom: '16px' }}>ACCESS DENIED</h2>
          <p style={{ color: 'var(--cyber-text-muted)' }}>Leader or Owner privileges required for user management</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          LOADING USER DATA...
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cyber-dark)' }}>
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 className="neon-text" style={{
            fontSize: '48px',
            fontWeight: '700',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            👥 USER MATRIX
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            ADVANCED USER MANAGEMENT SYSTEM
          </p>
        </div>

        {/* Stats Cards */}
        <div className="data-grid" style={{ marginBottom: '32px' }}>
          <div className="metric-card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <span style={{
                color: 'var(--cyber-text-muted)',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: '600'
              }}>
                TOTAL USERS
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-blue)' }}>👥</span>
            </div>
            <div className="metric-value">{users.length}</div>
            <div className="metric-label">REGISTERED ACCOUNTS</div>
          </div>

          <div className="metric-card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <span style={{
                color: 'var(--cyber-text-muted)',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: '600'
              }}>
                ACTIVE AGENTS
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-green)' }}>🚀</span>
            </div>
            <div className="metric-value">{users.filter(u => u.role === 'agent' && u.isActive !== false).length}</div>
            <div className="metric-label">SALES AGENTS</div>
          </div>

          <div className="metric-card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <span style={{
                color: 'var(--cyber-text-muted)',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: '600'
              }}>
                TEAM LEADERS
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-purple)' }}>👑</span>
            </div>
            <div className="metric-value">{users.filter(u => u.role === 'leader').length}</div>
            <div className="metric-label">LEADERSHIP ROLES</div>
          </div>

          <div className="metric-card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <span style={{
                color: 'var(--cyber-text-muted)',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: '600'
              }}>
              CAN CREATE TEAMS
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-pink)' }}>🌐</span>
            </div>
            <div className="metric-value">{users.filter(u => u.canCreateTeams || u.role === 'owner').length}</div>
            <div className="metric-label">TEAM CREATION RIGHTS</div>
          </div>
        </div>

        {/* Controls */}
        <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 className="neon-text" style={{ margin: 0 }}>🔍 USER CONTROLS</h3>
            {user?.role === 'owner' && (
              <button
                className="cyber-btn"
                onClick={() => { setModalType('create'); setShowModal(true); }}
              >
                ➕ CREATE USER
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="cyber-label">ROLE FILTER</label>
              <select
                className="cyber-input"
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="">All Roles</option>
                <option value="owner">Owner</option>
                <option value="leader">Leader</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            <div>
              <label className="cyber-label">STATUS FILTER</label>
              <select
                className="cyber-input"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setFilters({ role: '', status: '' })}
            className="cyber-btn secondary"
          >
            🔄 RESET FILTERS
          </button>
        </div>

        {/* Users Table */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '24px' }}>📡 USER DATABASE</h3>

          <div style={{ overflowX: 'auto' }}>
            <table className="holo-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>ROLE</th>
                  <th>SPONSOR/LEADER</th>
                  <th>TEAM RIGHTS</th>
                  <th>STATUS</th>
                  <th>CREATED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(userItem => (
                  <tr key={userItem._id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                          {userItem.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                          {userItem.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        color: getRoleColor(userItem.role),
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        fontSize: '12px'
                      }}>
                        {getRoleText(userItem.role)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        {userItem.sponsorId ? (
                          <>
                            <div style={{ color: 'var(--cyber-text)' }}>
                              {users.find(u => u._id === userItem.sponsorId)?.name || 'Unknown'}
                            </div>
                            <div style={{ color: 'var(--cyber-text-muted)' }}>
                              {users.find(u => u._id === userItem.sponsorId)?.email}
                            </div>
                          </>
                        ) : (
                          <div>
                            <div style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
                              {users.find(u => u.role === 'owner')?.name || 'Fyxed Admin'}
                            </div>
                            <div style={{ color: 'var(--cyber-text-muted)', fontSize: '10px' }}>
                              Auto-assigned to Fyxed
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`cyber-badge ${userItem.canCreateTeams || userItem.role === 'owner' ? 'success' : 'secondary'}`}>
                        {userItem.canCreateTeams || userItem.role === 'owner' ? 'CAN CREATE' : 'NO ACCESS'}
                      </span>
                    </td>
                    <td>
                      <span className={`cyber-badge ${getUserStatusBadge(userItem)}`}>
                        {userItem.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div style={{ color: 'var(--cyber-text)' }}>
                        {formatDate(userItem.createdAt)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                        {(user?.role === 'owner' || (user?.role === 'leader' && userItem.role === 'agent')) && (
                          <>
                            <button
                              onClick={() => { setSelectedUser(userItem); setModalType('edit'); setShowModal(true); }}
                              style={{
                                background: 'rgba(0, 212, 255, 0.2)',
                                border: '1px solid var(--neon-blue)',
                                color: 'var(--neon-blue)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                textTransform: 'uppercase'
                              }}
                            >
                              ✏️ EDIT
                            </button>

                            {userItem.role === 'agent' && (
                              <button
                                onClick={() => { setSelectedUser(userItem); setModalType('assign'); setShowModal(true); }}
                                style={{
                                  background: 'rgba(139, 92, 246, 0.2)',
                                  border: '1px solid var(--neon-purple)',
                                  color: 'var(--neon-purple)',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  textTransform: 'uppercase'
                                }}
                              >
                                👥 ASSIGN
                              </button>
                            )}

                            {user?.role === 'owner' && userItem.role !== 'owner' && (
                              <button
                                onClick={() => handleDeleteUser(userItem._id)}
                                style={{
                                  background: 'rgba(244, 113, 181, 0.2)',
                                  border: '1px solid var(--neon-pink)',
                                  color: 'var(--neon-pink)',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  textTransform: 'uppercase'
                                }}
                              >
                                🗑️ DELETE
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal */}
        {showModal && modalType === 'create' && (
          <Modal onClose={() => { setShowModal(false); resetForm(); }} title="👤 CREATE NEW USER">
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="cyber-form-group">
                  <label className="cyber-label">FULL NAME *</label>
                  <input
                    type="text"
                    className="cyber-input"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="cyber-form-group">
                  <label className="cyber-label">EMAIL *</label>
                  <input
                    type="email"
                    className="cyber-input"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="cyber-form-group">
                  <label className="cyber-label">ROLE *</label>
                  <select
                    className="cyber-input"
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="agent">Agent</option>
                    <option value="leader">Leader</option>
                    {user?.role === 'owner' && <option value="owner">Owner</option>}
                  </select>
                </div>

                <div className="cyber-form-group">
                  <label className="cyber-label">PHONE</label>
                  <input
                    type="tel"
                    className="cyber-input"
                    value={newUser.phone}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="cyber-form-group">
                <label className="cyber-label">ASSIGN TO LEADER/SPONSOR</label>
                <select
                  className="cyber-input"
                  value={newUser.sponsorId}
                  onChange={(e) => setNewUser(prev => ({ ...prev, sponsorId: e.target.value }))}
                >
                  <option value="">No Sponsor/Leader</option>
                  {potentialSponsors.map(sponsor => (
                    <option key={sponsor._id} value={sponsor._id}>
                      {sponsor.name} ({getRoleText(sponsor.role)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{
                padding: '16px',
                background: 'rgba(0, 255, 163, 0.1)',
                border: '1px solid rgba(0, 255, 163, 0.3)',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ color: 'var(--neon-green)', fontWeight: '600', marginBottom: '8px' }}>
                  ℹ️ DEFAULT PASSWORD INFO
                </div>
                <div style={{ color: 'var(--cyber-text)', fontSize: '14px' }}>
                  • New users will receive the default password: <strong>newuser123</strong><br/>
                  • Users can change their password after first login<br/>
                  • You'll see the login credentials after creating the user
                </div>
              </div>

              {user?.role === 'owner' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={newUser.canCreateTeams}
                    onChange={(e) => setNewUser(prev => ({ ...prev, canCreateTeams: e.target.checked }))}
                    style={{ transform: 'scale(1.5)' }}
                  />
                  <label style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                    Allow Team Creation Rights
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cyber-btn secondary"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  ✕ CANCEL
                </button>
                <button type="submit" className="cyber-btn primary">
                  🚀 CREATE USER
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit User Modal */}
        {showModal && modalType === 'edit' && selectedUser && (
          <Modal onClose={() => setShowModal(false)} title="✏️ EDIT USER">
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">👤 USER DETAILS</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="cyber-form-group">
                    <label className="cyber-label">NAME</label>
                    <input
                      type="text"
                      className="cyber-input"
                      value={selectedUser.name}
                      onChange={(e) => setSelectedUser(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="cyber-form-group">
                    <label className="cyber-label">EMAIL</label>
                    <input
                      type="email"
                      className="cyber-input"
                      value={selectedUser.email}
                      onChange={(e) => setSelectedUser(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  {user?.role === 'owner' && (
                    <div className="cyber-form-group">
                      <label className="cyber-label">ROLE</label>
                      <select
                        className="cyber-input"
                        value={selectedUser.role}
                        onChange={(e) => setSelectedUser(prev => ({ ...prev, role: e.target.value }))}
                      >
                        <option value="agent">Agent</option>
                        <option value="leader">Leader</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                  )}

                  {user?.role === 'owner' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedUser.canCreateTeams}
                        onChange={(e) => setSelectedUser(prev => ({ ...prev, canCreateTeams: e.target.checked }))}
                        style={{ transform: 'scale(1.5)' }}
                      />
                      <label style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                        Team Creation Rights
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">👥 TEAM ASSIGNMENT</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="cyber-form-group">
                    <label className="cyber-label">ASSIGN TO LEADER/SPONSOR</label>
                    <select
                      className="cyber-input"
                      value={selectedUser.sponsorId || ''}
                      onChange={(e) => setSelectedUser(prev => ({ ...prev, sponsorId: e.target.value || null }))}
                    >
                      <option value="">No Leader/Sponsor</option>
                      {potentialSponsors.filter(sponsor => sponsor._id !== selectedUser._id).map(sponsor => (
                        <option key={sponsor._id} value={sponsor._id}>
                          {sponsor.name} ({getRoleText(sponsor.role)}) - {sponsor.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedUser.sponsorId !== (users.find(u => u._id === selectedUser._id)?.sponsorId || null) && (
                    <div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '8px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ color: 'var(--neon-yellow)', fontWeight: '600', marginBottom: '4px' }}>
                          ⚠️ TEAM TRANSFER DETECTED
                        </div>
                        <div style={{ color: 'var(--cyber-text)', fontSize: '14px' }}>
                          <strong>From:</strong> {users.find(u => u._id === (users.find(u => u._id === selectedUser._id)?.sponsorId))?.name || 'No Leader'}<br/>
                          <strong>To:</strong> {users.find(u => u._id === selectedUser.sponsorId)?.name || 'No Leader'}<br/>
                          <strong>Effect:</strong> Future commissions will flow to new leader.
                        </div>
                      </div>

                      <div style={{
                        padding: '12px',
                        background: 'rgba(244, 113, 181, 0.1)',
                        border: '1px solid rgba(244, 113, 181, 0.3)',
                        borderRadius: '8px'
                      }}>
                        <div style={{ color: 'var(--neon-pink)', fontWeight: '600', marginBottom: '4px' }}>
                          🚨 IMPACT ANALYSIS
                        </div>
                        <div style={{ color: 'var(--cyber-text)', fontSize: '13px' }}>
                          • <strong>Sales Count:</strong> {users.find(u => u._id === selectedUser._id)?.salesCount || 0} historical sales will remain with user<br/>
                          • <strong>Old Leader:</strong> Will lose future override commissions from this user<br/>
                          • <strong>New Leader:</strong> Will receive 10% override from future sales<br/>
                          • <strong>User:</strong> Keeps all historical data and commission earnings
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{
                    padding: '12px',
                    background: 'rgba(0, 255, 163, 0.1)',
                    border: '1px solid rgba(0, 255, 163, 0.3)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: 'var(--neon-green)', fontWeight: '600', marginBottom: '4px' }}>
                      ✅ DATA PROTECTION GUARANTEE
                    </div>
                    <div style={{ color: 'var(--cyber-text)', fontSize: '14px' }}>
                      • All existing sales records remain intact<br/>
                      • Historical commissions are preserved<br/>
                      • Performance history stays with the user<br/>
                      • Only future commission flow changes
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="cyber-btn secondary"
                  onClick={() => setShowModal(false)}
                >
                  ✕ CANCEL
                </button>
                <button
                  className="cyber-btn primary"
                  onClick={() => handleUpdateUser(selectedUser._id, selectedUser)}
                >
                  💾 SAVE CHANGES
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Assign Leader Modal */}
        {showModal && modalType === 'assign' && selectedUser && (
          <Modal onClose={() => setShowModal(false)} title="👥 ASSIGN TO LEADER">
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">👤 AGENT: {selectedUser.name}</div>
                <div className="cyber-info-content">
                  <div style={{ color: 'var(--cyber-text-muted)' }}>
                    {selectedUser.email}
                  </div>
                </div>
              </div>

              <div className="cyber-form-group">
                <label className="cyber-label">SELECT LEADER/SPONSOR</label>
                <select
                  className="cyber-input"
                  value={selectedUser.sponsorId || ''}
                  onChange={(e) => setSelectedUser(prev => ({ ...prev, sponsorId: e.target.value }))}
                >
                  <option value="">No Leader/Sponsor</option>
                  {potentialSponsors.map(sponsor => (
                    <option key={sponsor._id} value={sponsor._id}>
                      {sponsor.name} ({getRoleText(sponsor.role)}) - {sponsor.email}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="cyber-btn secondary"
                  onClick={() => setShowModal(false)}
                >
                  ✕ CANCEL
                </button>
                <button
                  className="cyber-btn primary"
                  onClick={() => handleAssignSponsor(selectedUser._id, selectedUser.sponsorId)}
                >
                  🎯 ASSIGN
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default UserManagement;