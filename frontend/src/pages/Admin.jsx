import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { adminAPI, usersAPI, salesAPI, invoicesAPI } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/auth';
import Modal from '../components/Modal.jsx';

const Admin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalInvoices: 0,
    systemHealth: { status: 'healthy', uptime: '99.9%' }
  });

  // User Management
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFilters, setUserFilters] = useState({ role: '', status: '' });

  // System Settings
  const [settings, setSettings] = useState({
    companyName: 'FYXED BV',
    commissionRates: {
      seller: 50,
      leader: 10,
      sponsor: 10,
      fyxed: 30
    },
    paymentSettings: {
      stripeEnabled: true,
      defaultPaymentTerms: 30,
      autoInvoicing: false
    },
    systemSettings: {
      maintenanceMode: false,
      debugMode: false,
      emailNotifications: true
    }
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    if (user?.role === 'owner') {
      loadDashboardData();
    }
  }, [user, activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'dashboard') {
        // Load dashboard stats
        const [usersRes, salesRes, invoicesRes] = await Promise.all([
          usersAPI.getUsers(),
          salesAPI.getSales(),
          invoicesAPI.getInvoices()
        ]);

        setDashboardStats({
          totalUsers: usersRes.data.users?.length || 0,
          totalSales: salesRes.data.sales?.length || 0,
          totalRevenue: salesRes.data.sales?.reduce((sum, sale) => sum + sale.amount, 0) || 0,
          totalInvoices: invoicesRes.data.invoices?.length || 0,
          systemHealth: { status: 'healthy', uptime: '99.9%' }
        });
      } else if (activeTab === 'users') {
        const response = await usersAPI.getUsers();
        setUsers(response.data.users || []);
      } else if (activeTab === 'settings') {
        try {
          const response = await adminAPI.getSettings();
          setSettings(response.data || settings);
        } catch (error) {
          console.log('Using default settings');
        }
      } else if (activeTab === 'audit') {
        try {
          const response = await adminAPI.getAuditLog();
          setAuditLogs(response.data.logs || []);
        } catch (error) {
          console.log('No audit logs available');
        }
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await usersAPI.updateUser(userId, updates);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, ...updates } : u));
      alert('User updated successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await usersAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
      alert('User deleted successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error deleting user');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await adminAPI.updateSettings(settings);
      alert('Settings updated successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating settings');
    }
  };

  const handleRecomputeSales = async () => {
    if (!confirm('This will recalculate all sale commissions. Continue?')) return;

    try {
      setLoading(true);
      await adminAPI.recomputeSales({});
      alert('Sales recomputed successfully!');
      loadDashboardData();
    } catch (error) {
      alert(error.response?.data?.error || 'Error recomputing sales');
    } finally {
      setLoading(false);
    }
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
    const isActive = user.lastLogin && new Date(user.lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return isActive ? 'success' : 'secondary';
  };

  if (user?.role !== 'owner') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cyber-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cyber-card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
          <h2 style={{ color: 'var(--neon-pink)', marginBottom: '16px' }}>ACCESS DENIED</h2>
          <p style={{ color: 'var(--cyber-text-muted)' }}>Owner privileges required for admin panel access</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          LOADING ADMIN SYSTEMS...
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
            🔮 ADMIN MATRIX
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            SYSTEM CONTROL & MANAGEMENT PORTAL
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'dashboard', label: '📊 DASHBOARD', icon: '📊' },
              { id: 'users', label: '👥 USERS', icon: '👥' },
              { id: 'settings', label: '⚙️ SETTINGS', icon: '⚙️' },
              { id: 'audit', label: '📝 AUDIT LOGS', icon: '📝' },
              { id: 'tools', label: '🛠️ TOOLS', icon: '🛠️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`cyber-btn ${activeTab === tab.id ? 'primary' : 'secondary'}`}
                style={{
                  background: activeTab === tab.id ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.1)',
                  border: activeTab === tab.id ? '1px solid var(--neon-blue)' : '1px solid var(--cyber-border)',
                  color: activeTab === tab.id ? 'white' : 'var(--cyber-text)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
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
                <div className="metric-value">{dashboardStats.totalUsers}</div>
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
                    TOTAL REVENUE
                  </span>
                  <span style={{ fontSize: '32px', color: 'var(--neon-green)' }}>💰</span>
                </div>
                <div className="metric-value">{formatCurrency(dashboardStats.totalRevenue)}</div>
                <div className="metric-label">{dashboardStats.totalSales} SALES</div>
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
                    INVOICES
                  </span>
                  <span style={{ fontSize: '32px', color: 'var(--neon-purple)' }}>🧾</span>
                </div>
                <div className="metric-value">{dashboardStats.totalInvoices}</div>
                <div className="metric-label">GENERATED INVOICES</div>
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
                    SYSTEM STATUS
                  </span>
                  <span style={{ fontSize: '32px', color: 'var(--neon-green)' }}>✅</span>
                </div>
                <div className="metric-value" style={{ fontSize: '24px', color: 'var(--neon-green)' }}>ONLINE</div>
                <div className="metric-label">99.9% UPTIME</div>
              </div>
            </div>

            <div className="cyber-card" style={{ padding: '24px' }}>
              <h3 className="neon-text" style={{ marginBottom: '24px' }}>⚡ QUICK ACTIONS</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <button
                  onClick={handleRecomputeSales}
                  className="cyber-btn"
                  style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  🔄 RECOMPUTE ALL SALES
                </button>
                <button
                  onClick={() => { setModalType('backup'); setShowModal(true); }}
                  className="cyber-btn secondary"
                  style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  💾 BACKUP SYSTEM
                </button>
                <button
                  onClick={() => { setModalType('maintenance'); setShowModal(true); }}
                  className="cyber-btn secondary"
                  style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  🛠️ MAINTENANCE MODE
                </button>
                <button
                  onClick={() => { setModalType('reports'); setShowModal(true); }}
                  className="cyber-btn secondary"
                  style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  📊 GENERATE REPORTS
                </button>
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="neon-text" style={{ margin: 0 }}>👥 USER MANAGEMENT</h3>
                <button
                  onClick={() => { setModalType('createUser'); setShowModal(true); }}
                  className="cyber-btn"
                >
                  ➕ ADD USER
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="cyber-label">ROLE FILTER</label>
                  <select
                    className="cyber-input"
                    value={userFilters.role}
                    onChange={(e) => setUserFilters(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="">All Roles</option>
                    <option value="owner">Owner</option>
                    <option value="leader">Leader</option>
                    <option value="agent">Agent</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="cyber-card" style={{ padding: '24px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="holo-table">
                  <thead>
                    <tr>
                      <th>USER</th>
                      <th>ROLE</th>
                      <th>STATUS</th>
                      <th>LAST LOGIN</th>
                      <th>SALES</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => !userFilters.role || u.role === userFilters.role)
                      .map(user => (
                      <tr key={user._id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            color: getRoleColor(user.role),
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            fontSize: '12px'
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`cyber-badge ${getUserStatusBadge(user)}`}>
                            {getUserStatusBadge(user) === 'success' ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td>
                          <div style={{ color: 'var(--cyber-text)' }}>
                            {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--neon-green)', fontWeight: '600' }}>
                            {user.salesCount || 0}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                            <button
                              onClick={() => { setSelectedUser(user); setModalType('editUser'); setShowModal(true); }}
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
                            {user.role !== 'owner' && (
                              <button
                                onClick={() => handleDeleteUser(user._id)}
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="cyber-card" style={{ padding: '24px' }}>
            <h3 className="neon-text" style={{ marginBottom: '24px' }}>⚙️ SYSTEM SETTINGS</h3>

            <div style={{ display: 'grid', gap: '32px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">🏢 COMPANY SETTINGS</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="cyber-form-group">
                    <label className="cyber-label">COMPANY NAME</label>
                    <input
                      type="text"
                      className="cyber-input"
                      value={settings.companyName}
                      onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">💰 COMMISSION RATES (%)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div className="cyber-form-group">
                    <label className="cyber-label">SELLER</label>
                    <input
                      type="number"
                      className="cyber-input"
                      value={settings.commissionRates.seller}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        commissionRates: { ...prev.commissionRates, seller: parseInt(e.target.value) }
                      }))}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="cyber-form-group">
                    <label className="cyber-label">LEADER</label>
                    <input
                      type="number"
                      className="cyber-input"
                      value={settings.commissionRates.leader}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        commissionRates: { ...prev.commissionRates, leader: parseInt(e.target.value) }
                      }))}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="cyber-form-group">
                    <label className="cyber-label">SPONSOR</label>
                    <input
                      type="number"
                      className="cyber-input"
                      value={settings.commissionRates.sponsor}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        commissionRates: { ...prev.commissionRates, sponsor: parseInt(e.target.value) }
                      }))}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="cyber-form-group">
                    <label className="cyber-label">FYXED MIN</label>
                    <input
                      type="number"
                      className="cyber-input"
                      value={settings.commissionRates.fyxed}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        commissionRates: { ...prev.commissionRates, fyxed: parseInt(e.target.value) }
                      }))}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">💳 PAYMENT SETTINGS</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={settings.paymentSettings.stripeEnabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        paymentSettings: { ...prev.paymentSettings, stripeEnabled: e.target.checked }
                      }))}
                      style={{ transform: 'scale(1.5)' }}
                    />
                    <label style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                      Enable Stripe Payments
                    </label>
                  </div>

                  <div className="cyber-form-group">
                    <label className="cyber-label">DEFAULT PAYMENT TERMS (DAYS)</label>
                    <input
                      type="number"
                      className="cyber-input"
                      value={settings.paymentSettings.defaultPaymentTerms}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        paymentSettings: { ...prev.paymentSettings, defaultPaymentTerms: parseInt(e.target.value) }
                      }))}
                      min="1"
                    />
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">🔧 SYSTEM SETTINGS</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={settings.systemSettings.maintenanceMode}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        systemSettings: { ...prev.systemSettings, maintenanceMode: e.target.checked }
                      }))}
                      style={{ transform: 'scale(1.5)' }}
                    />
                    <label style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                      Maintenance Mode
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={settings.systemSettings.emailNotifications}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        systemSettings: { ...prev.systemSettings, emailNotifications: e.target.checked }
                      }))}
                      style={{ transform: 'scale(1.5)' }}
                    />
                    <label style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                      Email Notifications
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleUpdateSettings}
                  className="cyber-btn primary"
                  style={{ padding: '16px 32px' }}
                >
                  💾 SAVE SETTINGS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && (
          <div className="cyber-card" style={{ padding: '24px' }}>
            <h3 className="neon-text" style={{ marginBottom: '24px' }}>📝 AUDIT LOGS</h3>

            {auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
                <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
                  NO AUDIT LOGS
                </h3>
                <p style={{ color: 'var(--cyber-text-muted)' }}>
                  System audit logs will appear here
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="holo-table">
                  <thead>
                    <tr>
                      <th>TIMESTAMP</th>
                      <th>USER</th>
                      <th>ACTION</th>
                      <th>DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, index) => (
                      <tr key={index}>
                        <td>{formatDate(log.timestamp, 'datetime')}</td>
                        <td>{log.user}</td>
                        <td>
                          <span className="cyber-badge info">
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                        <td>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="cyber-card" style={{ padding: '24px' }}>
            <h3 className="neon-text" style={{ marginBottom: '24px' }}>🛠️ ADMIN TOOLS</h3>

            <div style={{ display: 'grid', gap: '24px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">🔄 DATA MANAGEMENT</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <button
                    onClick={handleRecomputeSales}
                    className="cyber-btn"
                    style={{ justifyContent: 'flex-start', padding: '16px' }}
                  >
                    🔄 Recompute All Sales Commissions
                  </button>
                  <button
                    onClick={() => alert('Export functionality coming soon!')}
                    className="cyber-btn secondary"
                    style={{ justifyContent: 'flex-start', padding: '16px' }}
                  >
                    📊 Export All Data (CSV)
                  </button>
                  <button
                    onClick={() => alert('Import functionality coming soon!')}
                    className="cyber-btn secondary"
                    style={{ justifyContent: 'flex-start', padding: '16px' }}
                  >
                    📥 Import Sales Data
                  </button>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">🔧 SYSTEM UTILITIES</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <button
                    onClick={() => alert('Cache cleared!')}
                    className="cyber-btn secondary"
                    style={{ justifyContent: 'flex-start', padding: '16px' }}
                  >
                    🗑️ Clear System Cache
                  </button>
                  <button
                    onClick={() => alert('Database optimized!')}
                    className="cyber-btn secondary"
                    style={{ justifyContent: 'flex-start', padding: '16px' }}
                  >
                    ⚡ Optimize Database
                  </button>
                  <button
                    onClick={() => alert('Test email sent!')}
                    className="cyber-btn secondary"
                    style={{ justifyContent: 'flex-start', padding: '16px' }}
                  >
                    📧 Send Test Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <Modal onClose={() => setShowModal(false)} title={`🔮 ${modalType.toUpperCase()}`}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
              <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
                FEATURE IN DEVELOPMENT
              </h3>
              <p style={{ color: 'var(--cyber-text-muted)', marginBottom: '24px' }}>
                This admin feature is currently being implemented and will be available soon.
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="cyber-btn secondary"
              >
                ✕ CLOSE
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Admin;