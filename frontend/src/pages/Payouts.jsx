import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { payoutsAPI, usersAPI } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/auth';
import Modal from '../components/Modal.jsx';

const Payouts = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    userId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [generateSettings, setGenerateSettings] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    minimumAmount: 50,
    includeUsers: 'all'
  });

  useEffect(() => {
    loadPayouts();
    loadUsers();
  }, [filters]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.status) params.status = filters.status;
      if (filters.userId) params.userId = filters.userId;
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;

      const response = await payoutsAPI.getPayouts(params);
      setPayouts(response.data.payouts || []);
    } catch (error) {
      console.error('Error loading payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleGeneratePayouts = async () => {
    if (!confirm('This will generate payouts for the specified period. Continue?')) return;

    try {
      setLoading(true);
      const response = await payoutsAPI.generatePayouts(generateSettings);

      if (response.data.payouts) {
        setPayouts(prev => [...response.data.payouts, ...prev]);
        setShowModal(false);
        alert(`Generated ${response.data.payouts.length} payouts successfully!`);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Error generating payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (payoutId, newStatus) => {
    try {
      await payoutsAPI.updatePayoutStatus(payoutId, { status: newStatus });
      setPayouts(prev => prev.map(payout =>
        payout._id === payoutId ? { ...payout, status: newStatus } : payout
      ));
      alert('Payout status updated successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating payout status');
    }
  };

  const handleMarkPaid = async (payoutId) => {
    const reference = prompt('Enter payment reference:');
    if (!reference) return;

    try {
      const paymentData = {
        paymentReference: reference,
        paymentDate: new Date().toISOString()
      };
      await payoutsAPI.markPayoutPaid(payoutId, paymentData);
      setPayouts(prev => prev.map(payout =>
        payout._id === payoutId ? {
          ...payout,
          status: 'paid',
          paymentReference: reference
        } : payout
      ));
      alert('Payout marked as paid!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error marking payout as paid');
    }
  };

  const handleExportPayouts = async () => {
    try {
      const period = `${filters.year}-${filters.month.toString().padStart(2, '0')}`;
      const response = await payoutsAPI.exportPayouts(period);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payouts-${period}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error exporting payouts');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'processing': return 'info';
      case 'failed': return 'danger';
      default: return 'warning';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'PENDING';
      case 'processing': return 'PROCESSING';
      case 'paid': return 'PAID';
      case 'failed': return 'FAILED';
      default: return status.toUpperCase();
    }
  };

  const totalPayoutValue = payouts.reduce((sum, payout) => sum + payout.amount, 0);
  const paidPayouts = payouts.filter(p => p.status === 'paid');
  const paidValue = paidPayouts.reduce((sum, payout) => sum + payout.amount, 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const pendingValue = pendingPayouts.reduce((sum, payout) => sum + payout.amount, 0);

  if (user?.role !== 'owner') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cyber-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cyber-card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
          <h2 style={{ color: 'var(--neon-pink)', marginBottom: '16px' }}>ACCESS DENIED</h2>
          <p style={{ color: 'var(--cyber-text-muted)' }}>Owner privileges required for payout management</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          LOADING PAYOUT DATA...
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
            💫 PAYOUT MATRIX
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            COMMISSION DISTRIBUTION CONTROL SYSTEM
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
                TOTAL PAYOUTS
              </span>
              <span style={{
                fontSize: '32px',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                💫
              </span>
            </div>
            <div className="metric-value">{formatCurrency(totalPayoutValue)}</div>
            <div className="metric-label">{payouts.length} TOTAL PAYOUTS</div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: '85%' }}
              ></div>
            </div>
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
                PAID OUT
              </span>
              <span style={{
                fontSize: '32px',
                color: 'var(--neon-green)'
              }}>
                💰
              </span>
            </div>
            <div className="metric-value" style={{
              background: 'linear-gradient(135deg, var(--neon-green), #00d4aa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {formatCurrency(paidValue)}
            </div>
            <div className="metric-label">
              {paidPayouts.length} OF {payouts.length} COMPLETED
            </div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: `${payouts.length > 0 ? (paidPayouts.length / payouts.length) * 100 : 0}%` }}
              ></div>
            </div>
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
                PENDING
              </span>
              <span style={{
                fontSize: '32px',
                color: 'var(--neon-purple)'
              }}>
                ⏳
              </span>
            </div>
            <div className="metric-value" style={{
              background: 'linear-gradient(135deg, var(--neon-purple), #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {formatCurrency(pendingValue)}
            </div>
            <div className="metric-label">
              {pendingPayouts.length} AWAITING PROCESSING
            </div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{
                  width: `${payouts.length > 0 ? (pendingPayouts.length / payouts.length) * 100 : 0}%`,
                  background: 'var(--neon-purple)'
                }}
              ></div>
            </div>
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
                AVG PAYOUT
              </span>
              <span style={{
                fontSize: '32px',
                color: 'var(--neon-blue)'
              }}>
                📊
              </span>
            </div>
            <div className="metric-value" style={{
              background: 'linear-gradient(135deg, var(--neon-blue), #0ea5e9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {formatCurrency(payouts.length > 0 ? totalPayoutValue / payouts.length : 0)}
            </div>
            <div className="metric-label">PER RECIPIENT</div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: '70%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 className="neon-text" style={{ margin: 0 }}>🔍 PAYOUT CONTROLS</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="cyber-btn"
                onClick={() => { setModalType('generate'); setShowModal(true); }}
              >
                ⚡ GENERATE PAYOUTS
              </button>
              <button
                className="cyber-btn secondary"
                onClick={handleExportPayouts}
              >
                📊 EXPORT DATA
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="cyber-label">STATUS</label>
              <select
                className="cyber-input"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="cyber-label">USER</label>
              <select
                className="cyber-input"
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="cyber-label">MONTH</label>
              <select
                className="cyber-input"
                value={filters.month}
                onChange={(e) => setFilters(prev => ({ ...prev, month: parseInt(e.target.value) }))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="cyber-label">YEAR</label>
              <select
                className="cyber-input"
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={2024 - i} value={2024 - i}>
                    {2024 - i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => setFilters({ status: '', userId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })}
            className="cyber-btn secondary"
          >
            🔄 RESET FILTERS
          </button>
        </div>

        {/* Payouts Table */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '24px' }}>📡 PAYOUT DATABASE</h3>

          {payouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>💫</div>
              <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
                NO PAYOUTS DETECTED
              </h3>
              <p style={{ color: 'var(--cyber-text-muted)', marginBottom: '24px' }}>
                Generate payouts to distribute commissions to team members
              </p>
              <button
                className="cyber-btn"
                onClick={() => { setModalType('generate'); setShowModal(true); }}
              >
                ⚡ GENERATE FIRST PAYOUTS
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="holo-table">
                <thead>
                  <tr>
                    <th>RECIPIENT</th>
                    <th>PERIOD</th>
                    <th>AMOUNT</th>
                    <th>BREAKDOWN</th>
                    <th>STATUS</th>
                    <th>REFERENCE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(payout => (
                    <tr key={payout._id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                            {payout.userId?.name || 'UNKNOWN'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                            {payout.userId?.email}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{
                          fontWeight: '600',
                          color: 'var(--neon-blue)',
                          fontFamily: 'monospace'
                        }}>
                          {payout.period?.month.toString().padStart(2, '0')}/{payout.period?.year}
                        </div>
                      </td>
                      <td>
                        <div style={{
                          fontWeight: '700',
                          fontSize: '16px',
                          color: 'var(--neon-green)',
                          textShadow: '0 0 10px currentColor'
                        }}>
                          {formatCurrency(payout.amount)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ color: 'var(--cyber-text)' }}>
                            Own: {formatCurrency(payout.breakdown?.ownSales || 0)}
                          </div>
                          <div style={{ color: 'var(--cyber-text-muted)' }}>
                            Override: {formatCurrency(payout.breakdown?.overrides || 0)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`cyber-badge ${getStatusBadge(payout.status)}`}>
                          {getStatusText(payout.status)}
                        </span>
                      </td>
                      <td>
                        <div style={{
                          color: 'var(--cyber-text-muted)',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}>
                          {payout.paymentReference || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                          {payout.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(payout._id, 'processing')}
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
                              ⚡ PROCESS
                            </button>
                          )}
                          {payout.status === 'processing' && (
                            <button
                              onClick={() => handleMarkPaid(payout._id)}
                              style={{
                                background: 'rgba(0, 255, 163, 0.2)',
                                border: '1px solid var(--neon-green)',
                                color: 'var(--neon-green)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                textTransform: 'uppercase'
                              }}
                            >
                              💰 MARK PAID
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedPayout(payout); setModalType('details'); setShowModal(true); }}
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
                            👁️ VIEW
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modals */}
        {showModal && modalType === 'generate' && (
          <Modal onClose={() => setShowModal(false)} title="⚡ PAYOUT GENERATOR">
            <form onSubmit={(e) => { e.preventDefault(); handleGeneratePayouts(); }} style={{ display: 'grid', gap: '20px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">📅 PERIOD SELECTION</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="cyber-form-group">
                    <label className="cyber-label">MONTH</label>
                    <select
                      className="cyber-input"
                      value={generateSettings.month}
                      onChange={(e) => setGenerateSettings(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cyber-form-group">
                    <label className="cyber-label">YEAR</label>
                    <select
                      className="cyber-input"
                      value={generateSettings.year}
                      onChange={(e) => setGenerateSettings(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <option key={2024 - i} value={2024 - i}>
                          {2024 - i}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">⚙️ GENERATION SETTINGS</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="cyber-form-group">
                    <label className="cyber-label">MINIMUM AMOUNT (EUR)</label>
                    <input
                      type="number"
                      className="cyber-input"
                      value={generateSettings.minimumAmount}
                      onChange={(e) => setGenerateSettings(prev => ({ ...prev, minimumAmount: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="cyber-form-group">
                    <label className="cyber-label">INCLUDE USERS</label>
                    <select
                      className="cyber-input"
                      value={generateSettings.includeUsers}
                      onChange={(e) => setGenerateSettings(prev => ({ ...prev, includeUsers: e.target.value }))}
                    >
                      <option value="all">All Users</option>
                      <option value="active">Active Users Only</option>
                      <option value="agents">Agents Only</option>
                      <option value="leaders">Leaders Only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cyber-btn secondary"
                  onClick={() => setShowModal(false)}
                >
                  ✕ CANCEL
                </button>
                <button type="submit" className="cyber-btn primary">
                  ⚡ GENERATE PAYOUTS
                </button>
              </div>
            </form>
          </Modal>
        )}

        {showModal && modalType === 'details' && selectedPayout && (
          <Modal onClose={() => setShowModal(false)} title="🔍 PAYOUT ANALYSIS">
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">👤 RECIPIENT DETAILS</div>
                <div className="cyber-info-content">
                  <div style={{ fontWeight: '600', color: 'var(--neon-blue)', marginBottom: '8px' }}>
                    {selectedPayout.userId?.name}
                  </div>
                  <div style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
                    {selectedPayout.userId?.email}
                  </div>
                  <div style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
                    Role: {selectedPayout.userId?.role?.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">📅 PAYOUT PERIOD</div>
                <div className="cyber-info-content">
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: 'var(--neon-purple)',
                    textShadow: '0 0 10px currentColor'
                  }}>
                    {new Date(selectedPayout.period.year, selectedPayout.period.month - 1).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">💰 AMOUNT BREAKDOWN</div>
                <div className="cyber-info-content">
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: 'var(--neon-green)',
                    textShadow: '0 0 10px currentColor',
                    marginBottom: '16px'
                  }}>
                    {formatCurrency(selectedPayout.amount)}
                  </div>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--cyber-text)' }}>Own Sales Commission:</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: '600' }}>
                        {formatCurrency(selectedPayout.breakdown?.ownSales || 0)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--cyber-text)' }}>Override Commission:</span>
                      <span style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
                        {formatCurrency(selectedPayout.breakdown?.overrides || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">📊 STATUS & PAYMENT</div>
                <div className="cyber-info-content">
                  <div style={{ marginBottom: '12px' }}>
                    <span className={`cyber-badge ${getStatusBadge(selectedPayout.status)}`}>
                      {getStatusText(selectedPayout.status)}
                    </span>
                  </div>

                  {selectedPayout.paymentReference && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--cyber-text)' }}>Payment Reference:</strong>
                      <div style={{
                        color: 'var(--cyber-text-muted)',
                        fontFamily: 'monospace',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        marginTop: '4px'
                      }}>
                        {selectedPayout.paymentReference}
                      </div>
                    </div>
                  )}

                  <div>
                    <strong style={{ color: 'var(--cyber-text)' }}>Created:</strong>
                    <div style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
                      {formatDate(selectedPayout.createdAt, 'datetime')}
                    </div>
                  </div>
                </div>
              </div>

              {selectedPayout.notes && (
                <div className="cyber-info-card">
                  <div className="cyber-info-header">📝 NOTES</div>
                  <div className="cyber-info-content">
                    <div style={{
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      color: 'var(--cyber-text)',
                      lineHeight: '1.5'
                    }}>
                      {selectedPayout.notes}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                className="cyber-btn secondary"
                onClick={() => setShowModal(false)}
              >
                ✕ CLOSE ANALYSIS
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Payouts;