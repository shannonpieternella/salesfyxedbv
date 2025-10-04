import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { salesAPI, usersAPI } from '../utils/api';
import { formatCurrency, formatDate, getStatusBadge, getStatusText } from '../utils/auth';
import Modal from '../components/Modal.jsx';
import '../styles/dashboard.css';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    sellerId: '',
    startDate: '',
    endDate: ''
  });

  const [newSale, setNewSale] = useState({
    sellerId: user?._id || '',
    amount: '',
    currency: 'EUR',
    customer: {
      name: '',
      company: '',
      contact: ''
    },
    meta: {
      source: 'custom',
      notes: ''
    }
  });

  useEffect(() => {
    loadSales();
    loadUsers();
  }, [filters]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.status) params.status = filters.status;
      if (filters.sellerId) params.sellerId = filters.sellerId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await salesAPI.getSales(params);
      setSales(response.data.sales || []);
    } catch (error) {
      console.error('Error loading sales:', error);
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

  const handleCreateSale = async (e) => {
    e.preventDefault();

    if (!newSale.amount || parseFloat(newSale.amount) <= 0) {
      alert('Bedrag moet groter dan 0 zijn');
      return;
    }

    try {
      const saleData = {
        ...newSale,
        amount: parseFloat(newSale.amount)
      };

      const response = await salesAPI.createSale(saleData);

      if (response.data.sale) {
        setSales(prev => [response.data.sale, ...prev]);
        setShowModal(false);
        resetForm();
        alert('Sale succesvol aangemaakt!');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Error creating sale');
    }
  };

  const handleUpdateStatus = async (saleId, newStatus) => {
    try {
      await salesAPI.updateSale(saleId, { status: newStatus });
      setSales(prev => prev.map(sale =>
        sale._id === saleId ? { ...sale, status: newStatus } : sale
      ));
      alert('Status updated successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating status');
    }
  };

  const resetForm = () => {
    setNewSale({
      sellerId: user?._id || '',
      amount: '',
      currency: 'EUR',
      customer: {
        name: '',
        company: '',
        contact: ''
      },
      meta: {
        source: 'custom',
        notes: ''
      }
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalCommission = sales.reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          LOADING SALES DATA...
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
            🚀 SALES MATRIX
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            ADVANCED SALES MANAGEMENT SYSTEM
          </p>
        </div>

        {/* Stats Cards */}
        <div className="data-grid">
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
              <span style={{
                fontSize: '32px',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                💎
              </span>
            </div>
            <div className="metric-value">{formatCurrency(totalRevenue)}</div>
            <div className="metric-label">{sales.length} TOTAL SALES</div>
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
                MY COMMISSION
              </span>
              <span style={{
                fontSize: '32px',
                color: 'var(--neon-green)'
              }}>
                🚀
              </span>
            </div>
            <div className="metric-value" style={{
              background: 'linear-gradient(135deg, var(--neon-green), #00d4aa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {formatCurrency(totalCommission)}
            </div>
            <div className="metric-label">
              {((totalCommission / totalRevenue) * 100 || 0).toFixed(1)}% OF REVENUE
            </div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: `${(totalCommission / totalRevenue) * 100 || 0}%` }}
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
                AVG SALE VALUE
              </span>
              <span style={{
                fontSize: '32px',
                color: 'var(--neon-purple)'
              }}>
                📊
              </span>
            </div>
            <div className="metric-value" style={{
              background: 'linear-gradient(135deg, var(--neon-purple), #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {formatCurrency(sales.length > 0 ? totalRevenue / sales.length : 0)}
            </div>
            <div className="metric-label">PER TRANSACTION</div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: '65%' }}
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
                SUCCESS RATE
              </span>
              <span style={{
                fontSize: '32px',
                color: 'var(--neon-blue)'
              }}>
                ⚡
              </span>
            </div>
            <div className="metric-value" style={{
              background: 'linear-gradient(135deg, var(--neon-blue), #0ea5e9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {sales.length > 0 ? Math.round((sales.filter(s => s.status === 'paid').length / sales.length) * 100) : 0}%
            </div>
            <div className="metric-label">CONVERSION RATE</div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{
                  width: `${sales.length > 0 ? (sales.filter(s => s.status === 'paid').length / sales.length) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 className="neon-text" style={{ margin: 0 }}>🔍 FILTERS & CONTROLS</h3>
            <button
              className="cyber-btn"
              onClick={() => setShowModal(true)}
            >
              ➕ NEW SALE
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--cyber-text)',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                STATUS
              </label>
              <select
                className="cyber-input"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {(user?.role === 'owner' || user?.role === 'leader') && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--cyber-text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  SELLER
                </label>
                <select
                  className="cyber-input"
                  value={filters.sellerId}
                  onChange={(e) => handleFilterChange('sellerId', e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">All Sellers</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--cyber-text)',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                FROM DATE
              </label>
              <input
                type="date"
                className="cyber-input"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--cyber-text)',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                TO DATE
              </label>
              <input
                type="date"
                className="cyber-input"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <button
            onClick={() => setFilters({ status: '', sellerId: '', startDate: '', endDate: '' })}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--cyber-border)',
              color: 'var(--cyber-text)',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'var(--transition-smooth)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(0, 212, 255, 0.2)';
              e.target.style.borderColor = 'var(--neon-blue)';
              e.target.style.color = 'var(--neon-blue)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'var(--cyber-border)';
              e.target.style.color = 'var(--cyber-text)';
            }}
          >
            🔄 RESET FILTERS
          </button>
        </div>

        {/* Sales Table */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '24px' }}>📡 SALES DATABASE</h3>

          {sales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚀</div>
              <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
                NO SALES DETECTED
              </h3>
              <p style={{ color: 'var(--cyber-text-muted)', marginBottom: '24px' }}>
                Initialize your first transaction in the sales matrix
              </p>
              <button
                className="cyber-btn"
                onClick={() => setShowModal(true)}
              >
                ➕ INITIATE FIRST SALE
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="holo-table">
                <thead>
                  <tr>
                    <th>CLIENT</th>
                    <th>SELLER</th>
                    <th>AMOUNT</th>
                    <th>COMMISSION</th>
                    <th>SOURCE</th>
                    <th>STATUS</th>
                    <th>TIMESTAMP</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale._id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                            {sale.customer?.name || 'UNKNOWN'}
                          </div>
                          {sale.customer?.company && (
                            <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                              {sale.customer.company}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                            {sale.sellerId?.name || 'UNKNOWN'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                            {sale.sellerId?.email}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{
                          fontWeight: '700',
                          fontSize: '16px',
                          color: 'var(--neon-blue)',
                          textShadow: '0 0 10px currentColor'
                        }}>
                          {formatCurrency(sale.amount)}
                        </div>
                      </td>
                      <td>
                        <div style={{
                          fontWeight: '700',
                          fontSize: '16px',
                          color: 'var(--neon-green)',
                          textShadow: '0 0 10px currentColor'
                        }}>
                          {formatCurrency(sale.computed?.sellerShare || 0)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                          50% RATE
                        </div>
                      </td>
                      <td>
                        <span className={`cyber-badge ${sale.meta?.source === 'stripe-payment' ? 'info' : 'secondary'}`}>
                          {sale.meta?.source?.replace('-', ' ') || 'MANUAL'}
                        </span>
                      </td>
                      <td>
                        <span className={`cyber-badge ${getStatusBadge(sale.status)}`}>
                          {getStatusText(sale.status).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ color: 'var(--cyber-text)' }}>
                          {formatDate(sale.createdAt)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                          {new Date(sale.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                          {sale.status === 'open' && (user?.role === 'owner' || user?.role === 'leader') && (
                            <button
                              onClick={() => handleUpdateStatus(sale._id, 'approved')}
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
                              ✅ APPROVE
                            </button>
                          )}
                          {sale.status === 'approved' && (user?.role === 'owner' || user?.role === 'leader') && (
                            <button
                              onClick={() => handleUpdateStatus(sale._id, 'paid')}
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
                              💰 PAID
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSale(sale)}
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

        {/* New Sale Modal */}
        {showModal && (
          <Modal onClose={() => { setShowModal(false); resetForm(); }} title="💰 NEW SALE MATRIX">
            <form onSubmit={handleCreateSale} style={{ display: 'grid', gap: '20px' }}>
              {(user?.role === 'owner' || user?.role === 'leader') && (
                <div className="cyber-form-group">
                  <label className="cyber-label">SELLER *</label>
                  <select
                    className="cyber-input"
                    value={newSale.sellerId}
                    onChange={(e) => setNewSale(prev => ({ ...prev, sellerId: e.target.value }))}
                    required
                  >
                    <option value="">SELECT SELLER...</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="cyber-form-group">
                <label className="cyber-label">AMOUNT * (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="cyber-input"
                  value={newSale.amount}
                  onChange={(e) => setNewSale(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="1000.00"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="cyber-form-group">
                  <label className="cyber-label">CLIENT NAME</label>
                  <input
                    type="text"
                    className="cyber-input"
                    value={newSale.customer.name}
                    onChange={(e) => setNewSale(prev => ({
                      ...prev,
                      customer: { ...prev.customer, name: e.target.value }
                    }))}
                    placeholder="Jan van der Berg"
                  />
                </div>

                <div className="cyber-form-group">
                  <label className="cyber-label">COMPANY</label>
                  <input
                    type="text"
                    className="cyber-input"
                    value={newSale.customer.company}
                    onChange={(e) => setNewSale(prev => ({
                      ...prev,
                      customer: { ...prev.customer, company: e.target.value }
                    }))}
                    placeholder="Company BV"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="cyber-form-group">
                  <label className="cyber-label">CONTACT</label>
                  <input
                    type="text"
                    className="cyber-input"
                    value={newSale.customer.contact}
                    onChange={(e) => setNewSale(prev => ({
                      ...prev,
                      customer: { ...prev.customer, contact: e.target.value }
                    }))}
                    placeholder="jan@company.nl"
                  />
                </div>

                <div className="cyber-form-group">
                  <label className="cyber-label">SOURCE</label>
                  <select
                    className="cyber-input"
                    value={newSale.meta.source}
                    onChange={(e) => setNewSale(prev => ({
                      ...prev,
                      meta: { ...prev.meta, source: e.target.value }
                    }))}
                  >
                    <option value="custom">CUSTOM</option>
                    <option value="lead-activation">LEAD ACTIVATION</option>
                    <option value="retainer">RETAINER</option>
                  </select>
                </div>
              </div>

              <div className="cyber-form-group">
                <label className="cyber-label">NOTES</label>
                <textarea
                  className="cyber-input"
                  rows="3"
                  value={newSale.meta.notes}
                  onChange={(e) => setNewSale(prev => ({
                    ...prev,
                    meta: { ...prev.meta, notes: e.target.value }
                  }))}
                  placeholder="Additional sale information..."
                  style={{ resize: 'vertical', minHeight: '80px' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  className="cyber-btn secondary"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  ✕ CANCEL
                </button>
                <button type="submit" className="cyber-btn primary">
                  🚀 CREATE SALE
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Sale Details Modal */}
        {selectedSale && (
          <Modal onClose={() => setSelectedSale(null)} title="🔍 SALE ANALYSIS">
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">👤 CLIENT DATA</div>
                <div className="cyber-info-content">
                  <div style={{ fontWeight: '600', color: 'var(--neon-blue)', marginBottom: '4px' }}>
                    {selectedSale.customer?.name || 'UNKNOWN CLIENT'}
                  </div>
                  {selectedSale.customer?.company && (
                    <div style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>Company: {selectedSale.customer.company}</div>
                  )}
                  {selectedSale.customer?.contact && (
                    <div style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>Contact: {selectedSale.customer.contact}</div>
                  )}
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">🚀 SELLER DATA</div>
                <div className="cyber-info-content">
                  <div style={{ fontWeight: '600', color: 'var(--neon-green)', marginBottom: '4px' }}>
                    {selectedSale.sellerId?.name}
                  </div>
                  <div style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>{selectedSale.sellerId?.email}</div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">💰 FINANCIAL DATA</div>
                <div className="cyber-info-content">
                  <div style={{
                    fontWeight: '700',
                    fontSize: '24px',
                    color: 'var(--neon-blue)',
                    textShadow: '0 0 10px currentColor',
                    marginBottom: '8px'
                  }}>
                    {formatCurrency(selectedSale.amount)}
                  </div>
                  <div style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>Currency: {selectedSale.currency}</div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">📊 COMMISSION BREAKDOWN</div>
                <div className="cyber-info-content" style={{ display: 'grid', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(0, 255, 163, 0.1)',
                    border: '1px solid rgba(0, 255, 163, 0.3)',
                    borderRadius: '6px'
                  }}>
                    <span style={{ color: 'var(--cyber-text)' }}>Seller (50%)</span>
                    <span style={{ color: 'var(--neon-green)', fontWeight: '700' }}>
                      {formatCurrency(selectedSale.computed?.sellerShare || 0)}
                    </span>
                  </div>
                  {selectedSale.computed?.leaderShare > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px'
                    }}>
                      <span style={{ color: 'var(--cyber-text)' }}>Leader (10%)</span>
                      <span style={{ color: 'var(--neon-purple)', fontWeight: '700' }}>
                        {formatCurrency(selectedSale.computed.leaderShare)}
                      </span>
                    </div>
                  )}
                  {selectedSale.computed?.sponsorShare > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px'
                    }}>
                      <span style={{ color: 'var(--cyber-text)' }}>Sponsor (10%)</span>
                      <span style={{ color: 'var(--neon-purple)', fontWeight: '700' }}>
                        {formatCurrency(selectedSale.computed.sponsorShare)}
                      </span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--cyber-border)',
                    borderRadius: '6px'
                  }}>
                    <span style={{ color: 'var(--cyber-text)' }}>Fyxed Share</span>
                    <span style={{ color: 'var(--cyber-text-muted)', fontWeight: '700' }}>
                      {formatCurrency(selectedSale.computed?.fyxedShare || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="cyber-info-card">
                  <div className="cyber-info-header">📡 STATUS</div>
                  <div className="cyber-info-content">
                    <span className={`cyber-badge ${getStatusBadge(selectedSale.status)}`}>
                      {getStatusText(selectedSale.status).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="cyber-info-card">
                  <div className="cyber-info-header">🔗 SOURCE</div>
                  <div className="cyber-info-content">
                    <span className="cyber-badge secondary">
                      {selectedSale.meta?.source?.replace('-', ' ').toUpperCase() || 'CUSTOM'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedSale.meta?.notes && (
                <div className="cyber-info-card">
                  <div className="cyber-info-header">📝 NOTES</div>
                  <div className="cyber-info-content">
                    <div style={{
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--cyber-border)',
                      borderRadius: '8px',
                      color: 'var(--cyber-text)',
                      lineHeight: '1.5'
                    }}>
                      {selectedSale.meta.notes}
                    </div>
                  </div>
                </div>
              )}

              <div className="cyber-info-card">
                <div className="cyber-info-header">🕐 TIMESTAMP</div>
                <div className="cyber-info-content">
                  <div style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
                    {formatDate(selectedSale.createdAt, 'datetime')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                className="cyber-btn secondary"
                onClick={() => setSelectedSale(null)}
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

export default Sales;
