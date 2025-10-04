import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { invoicesAPI, usersAPI } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/auth';
import Modal from '../components/Modal.jsx';

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    sellerId: '',
    startDate: '',
    endDate: ''
  });

  const [newInvoice, setNewInvoice] = useState({
    sellerId: user?._id || '',
    customer: {
      name: '',
      company: '',
      email: '',
      address: {
        street: '',
        city: '',
        zipCode: '',
        country: 'Nederland'
      },
      vatNumber: ''
    },
    items: [{
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }],
    totals: {
      subtotal: 0,
      vatRate: 21,
      vatAmount: 0,
      total: 0
    },
    dates: {
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    paymentMethod: 'bank-transfer',
    notes: ''
  });

  useEffect(() => {
    loadInvoices();
    loadUsers();
  }, [filters]);

  useEffect(() => {
    calculateTotals();
  }, [newInvoice.items, newInvoice.totals.vatRate]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.status) params.status = filters.status;
      if (filters.sellerId) params.sellerId = filters.sellerId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await invoicesAPI.getInvoices(params);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
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

  const calculateTotals = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const vatAmount = (subtotal * newInvoice.totals.vatRate) / 100;
    const total = subtotal + vatAmount;

    setNewInvoice(prev => ({
      ...prev,
      totals: {
        ...prev.totals,
        subtotal,
        vatAmount,
        total
      }
    }));
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    if (newInvoice.items.length === 0 || !newInvoice.items[0].description) {
      alert('Add at least one line item to the invoice');
      return;
    }

    try {
      const response = await invoicesAPI.createInvoice(newInvoice);

      if (response.data.invoice) {
        setInvoices(prev => [response.data.invoice, ...prev]);
        setShowModal(false);
        resetForm();
        alert('Invoice created successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Error creating invoice');
    }
  };

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      await invoicesAPI.updateInvoiceStatus(invoiceId, newStatus);
      setInvoices(prev => prev.map(invoice =>
        invoice._id === invoiceId ? { ...invoice, status: newStatus } : invoice
      ));
      alert('Status updated successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating status');
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      const paymentData = {
        paymentDate: new Date().toISOString(),
        paymentReference: `Payment-${Date.now()}`
      };
      await invoicesAPI.markInvoicePaid(invoiceId, paymentData);
      setInvoices(prev => prev.map(invoice =>
        invoice._id === invoiceId ? {
          ...invoice,
          status: 'paid',
          dates: { ...invoice.dates, paidDate: new Date() }
        } : invoice
      ));
      alert('Invoice marked as paid!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error marking as paid');
    }
  };

  const addItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, {
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0
      }]
    }));
  };

  const removeItem = (index) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setNewInvoice(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };

      if (field === 'quantity' || field === 'unitPrice') {
        updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
      }

      return { ...prev, items: updatedItems };
    });
  };

  const resetForm = () => {
    setNewInvoice({
      sellerId: user?._id || '',
      customer: {
        name: '',
        company: '',
        email: '',
        address: {
          street: '',
          city: '',
          zipCode: '',
          country: 'Nederland'
        },
        vatNumber: ''
      },
      items: [{
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0
      }],
      totals: {
        subtotal: 0,
        vatRate: 21,
        vatAmount: 0,
        total: 0
      },
      dates: {
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      paymentMethod: 'bank-transfer',
      notes: ''
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'overdue': return 'danger';
      case 'cancelled': return 'secondary';
      default: return 'warning';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'draft': return 'CONCEPT';
      case 'sent': return 'VERZONDEN';
      case 'paid': return 'BETAALD';
      case 'overdue': return 'VERLOPEN';
      case 'cancelled': return 'GEANNULEERD';
      default: return status.toUpperCase();
    }
  };

  const totalInvoiceValue = invoices.reduce((sum, invoice) => sum + invoice.totals.total, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const paidValue = paidInvoices.reduce((sum, invoice) => sum + invoice.totals.total, 0);
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          LOADING INVOICE DATA...
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
            🧾 INVOICE MATRIX
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            ADVANCED BILLING MANAGEMENT SYSTEM
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
                TOTAL INVOICED
              </span>
              <span style={{
                fontSize: '32px',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                🧾
              </span>
            </div>
            <div className="metric-value">{formatCurrency(totalInvoiceValue)}</div>
            <div className="metric-label">{invoices.length} TOTAL INVOICES</div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: '90%' }}
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
                PAID INVOICES
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
              {paidInvoices.length} OF {invoices.length} PAID
            </div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: `${invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0}%` }}
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
                OVERDUE ALERTS
              </span>
              <span style={{
                fontSize: '32px',
                color: 'var(--neon-pink)'
              }}>
                ⚠️
              </span>
            </div>
            <div className="metric-value" style={{
              background: 'linear-gradient(135deg, var(--neon-pink), #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {overdueInvoices.length}
            </div>
            <div className="metric-label">REQUIRE ATTENTION</div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{
                  width: `${invoices.length > 0 ? (overdueInvoices.length / invoices.length) * 100 : 0}%`,
                  background: 'var(--neon-pink)'
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
                AVG INVOICE
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
              {formatCurrency(invoices.length > 0 ? totalInvoiceValue / invoices.length : 0)}
            </div>
            <div className="metric-label">PER TRANSACTION</div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: '75%' }}
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
              ➕ NEW INVOICE
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="cyber-label">STATUS</label>
              <select
                className="cyber-input"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {(user?.role === 'owner' || user?.role === 'leader') && (
              <div>
                <label className="cyber-label">SELLER</label>
                <select
                  className="cyber-input"
                  value={filters.sellerId}
                  onChange={(e) => handleFilterChange('sellerId', e.target.value)}
                >
                  <option value="">All Sellers</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="cyber-label">FROM DATE</label>
              <input
                type="date"
                className="cyber-input"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <label className="cyber-label">TO DATE</label>
              <input
                type="date"
                className="cyber-input"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={() => setFilters({ status: '', sellerId: '', startDate: '', endDate: '' })}
            className="cyber-btn secondary"
          >
            🔄 RESET FILTERS
          </button>
        </div>

        {/* Invoices Table */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '24px' }}>📡 INVOICE DATABASE</h3>

          {invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧾</div>
              <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
                NO INVOICES DETECTED
              </h3>
              <p style={{ color: 'var(--cyber-text-muted)', marginBottom: '24px' }}>
                Create your first invoice to start billing clients
              </p>
              <button
                className="cyber-btn"
                onClick={() => setShowModal(true)}
              >
                ➕ CREATE FIRST INVOICE
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="holo-table">
                <thead>
                  <tr>
                    <th>INVOICE #</th>
                    <th>CLIENT</th>
                    <th>SELLER</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                    <th>DUE DATE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice._id}>
                      <td>
                        <div style={{
                          fontWeight: '700',
                          color: 'var(--neon-blue)',
                          fontFamily: 'monospace'
                        }}>
                          {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                            {invoice.customer?.name || 'UNKNOWN'}
                          </div>
                          {invoice.customer?.company && (
                            <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                              {invoice.customer.company}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                            {invoice.sellerId?.name || 'UNKNOWN'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                            {invoice.sellerId?.email}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{
                          fontWeight: '700',
                          fontSize: '16px',
                          color: 'var(--neon-green)',
                          textShadow: '0 0 10px currentColor'
                        }}>
                          {formatCurrency(invoice.totals.total)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                          Incl. BTW
                        </div>
                      </td>
                      <td>
                        <span className={`cyber-badge ${getStatusBadge(invoice.status)}`}>
                          {getStatusText(invoice.status)}
                        </span>
                      </td>
                      <td>
                        <div style={{ color: 'var(--cyber-text)' }}>
                          {formatDate(invoice.dates.dueDate)}
                        </div>
                        {invoice.dates.paidDate && (
                          <div style={{ fontSize: '11px', color: 'var(--neon-green)' }}>
                            Paid: {formatDate(invoice.dates.paidDate)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                          {invoice.status === 'sent' && (user?.role === 'owner' || user?.role === 'leader') && (
                            <button
                              onClick={() => handleMarkPaid(invoice._id)}
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
                          {invoice.status === 'draft' && (user?.role === 'owner' || user?.role === 'leader') && (
                            <button
                              onClick={() => handleUpdateStatus(invoice._id, 'sent')}
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
                              📧 SEND
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
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

        {/* New Invoice Modal */}
        {showModal && (
          <Modal onClose={() => { setShowModal(false); resetForm(); }} title="🧾 NEW INVOICE GENERATOR">
            <form onSubmit={handleCreateInvoice} style={{ display: 'grid', gap: '24px' }}>
              {/* Seller Selection */}
              {(user?.role === 'owner' || user?.role === 'leader') && (
                <div className="cyber-form-group">
                  <label className="cyber-label">SELLER *</label>
                  <select
                    className="cyber-input"
                    value={newInvoice.sellerId}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, sellerId: e.target.value }))}
                    required
                  >
                    <option value="">SELECT SELLER...</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Info */}
              <div className="cyber-info-card">
                <div className="cyber-info-header">👤 CLIENT INFORMATION</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="cyber-form-group">
                      <label className="cyber-label">CLIENT NAME *</label>
                      <input
                        type="text"
                        className="cyber-input"
                        value={newInvoice.customer.name}
                        onChange={(e) => setNewInvoice(prev => ({
                          ...prev,
                          customer: { ...prev.customer, name: e.target.value }
                        }))}
                        required
                      />
                    </div>

                    <div className="cyber-form-group">
                      <label className="cyber-label">COMPANY</label>
                      <input
                        type="text"
                        className="cyber-input"
                        value={newInvoice.customer.company}
                        onChange={(e) => setNewInvoice(prev => ({
                          ...prev,
                          customer: { ...prev.customer, company: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="cyber-form-group">
                    <label className="cyber-label">EMAIL</label>
                    <input
                      type="email"
                      className="cyber-input"
                      value={newInvoice.customer.email}
                      onChange={(e) => setNewInvoice(prev => ({
                        ...prev,
                        customer: { ...prev.customer, email: e.target.value }
                      }))}
                    />
                  </div>

                  <div className="cyber-form-group">
                    <label className="cyber-label">VAT NUMBER</label>
                    <input
                      type="text"
                      className="cyber-input"
                      value={newInvoice.customer.vatNumber}
                      onChange={(e) => setNewInvoice(prev => ({
                        ...prev,
                        customer: { ...prev.customer, vatNumber: e.target.value }
                      }))}
                      placeholder="NL123456789B01"
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="cyber-info-card">
                <div className="cyber-info-header">📋 INVOICE ITEMS</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {newInvoice.items.map((item, index) => (
                    <div key={index} style={{
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--cyber-border)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                        <div className="cyber-form-group">
                          <label className="cyber-label">DESCRIPTION *</label>
                          <input
                            type="text"
                            className="cyber-input"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            required
                          />
                        </div>

                        <div className="cyber-form-group">
                          <label className="cyber-label">QTY</label>
                          <input
                            type="number"
                            className="cyber-input"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="1"
                            step="1"
                          />
                        </div>

                        <div className="cyber-form-group">
                          <label className="cyber-label">UNIT PRICE</label>
                          <input
                            type="number"
                            className="cyber-input"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="cyber-form-group">
                          <label className="cyber-label">TOTAL</label>
                          <div style={{
                            padding: '12px',
                            background: 'rgba(0, 255, 163, 0.1)',
                            border: '1px solid rgba(0, 255, 163, 0.3)',
                            borderRadius: '8px',
                            color: 'var(--neon-green)',
                            fontWeight: '700',
                            textAlign: 'center'
                          }}>
                            {formatCurrency(item.total)}
                          </div>
                        </div>

                        {newInvoice.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            style={{
                              background: 'rgba(244, 113, 181, 0.2)',
                              border: '1px solid var(--neon-pink)',
                              color: 'var(--neon-pink)',
                              padding: '8px',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addItem}
                    className="cyber-btn secondary"
                  >
                    ➕ ADD ITEM
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="cyber-info-card">
                <div className="cyber-info-header">💰 TOTALS</div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--cyber-text)' }}>Subtotal:</span>
                    <span style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                      {formatCurrency(newInvoice.totals.subtotal)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--cyber-text)' }}>VAT:</span>
                      <input
                        type="number"
                        className="cyber-input"
                        value={newInvoice.totals.vatRate}
                        onChange={(e) => setNewInvoice(prev => ({
                          ...prev,
                          totals: { ...prev.totals, vatRate: parseFloat(e.target.value) || 0 }
                        }))}
                        min="0"
                        max="100"
                        step="0.1"
                        style={{ width: '80px' }}
                      />
                      <span style={{ color: 'var(--cyber-text)' }}>%</span>
                    </div>
                    <span style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                      {formatCurrency(newInvoice.totals.vatAmount)}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderTop: '1px solid var(--cyber-border)',
                    marginTop: '8px'
                  }}>
                    <span style={{ color: 'var(--neon-green)', fontWeight: '700', fontSize: '18px' }}>TOTAL:</span>
                    <span style={{
                      color: 'var(--neon-green)',
                      fontWeight: '700',
                      fontSize: '20px',
                      textShadow: '0 0 10px currentColor'
                    }}>
                      {formatCurrency(newInvoice.totals.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates and Payment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="cyber-form-group">
                  <label className="cyber-label">INVOICE DATE</label>
                  <input
                    type="date"
                    className="cyber-input"
                    value={newInvoice.dates.invoiceDate}
                    onChange={(e) => setNewInvoice(prev => ({
                      ...prev,
                      dates: { ...prev.dates, invoiceDate: e.target.value }
                    }))}
                  />
                </div>

                <div className="cyber-form-group">
                  <label className="cyber-label">DUE DATE</label>
                  <input
                    type="date"
                    className="cyber-input"
                    value={newInvoice.dates.dueDate}
                    onChange={(e) => setNewInvoice(prev => ({
                      ...prev,
                      dates: { ...prev.dates, dueDate: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="cyber-form-group">
                <label className="cyber-label">PAYMENT METHOD</label>
                <select
                  className="cyber-input"
                  value={newInvoice.paymentMethod}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="stripe">Stripe Payment</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="cyber-form-group">
                <label className="cyber-label">NOTES</label>
                <textarea
                  className="cyber-input"
                  rows="3"
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional invoice notes..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cyber-btn secondary"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  ✕ CANCEL
                </button>
                <button type="submit" className="cyber-btn primary">
                  🚀 CREATE INVOICE
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Invoice Details Modal */}
        {selectedInvoice && (
          <Modal onClose={() => setSelectedInvoice(null)} title="🔍 INVOICE ANALYSIS">
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">📄 INVOICE #{selectedInvoice.invoiceNumber}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--cyber-text)' }}>Status:</strong>
                      <span className={`cyber-badge ${getStatusBadge(selectedInvoice.status)}`} style={{ marginLeft: '8px' }}>
                        {getStatusText(selectedInvoice.status)}
                      </span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--cyber-text)' }}>Invoice Date:</strong>
                      <span style={{ color: 'var(--cyber-text-muted)', marginLeft: '8px' }}>
                        {formatDate(selectedInvoice.dates.invoiceDate)}
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--cyber-text)' }}>Due Date:</strong>
                      <span style={{ color: 'var(--cyber-text-muted)', marginLeft: '8px' }}>
                        {formatDate(selectedInvoice.dates.dueDate)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--cyber-text)' }}>Payment Method:</strong>
                      <span style={{ color: 'var(--cyber-text-muted)', marginLeft: '8px' }}>
                        {selectedInvoice.paymentMethod?.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    {selectedInvoice.dates.paidDate && (
                      <div>
                        <strong style={{ color: 'var(--cyber-text)' }}>Paid Date:</strong>
                        <span style={{ color: 'var(--neon-green)', marginLeft: '8px' }}>
                          {formatDate(selectedInvoice.dates.paidDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">👤 CLIENT DATA</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div>
                    <strong style={{ color: 'var(--neon-blue)' }}>{selectedInvoice.customer.name}</strong>
                    {selectedInvoice.customer.company && (
                      <div style={{ color: 'var(--cyber-text-muted)' }}>{selectedInvoice.customer.company}</div>
                    )}
                  </div>
                  {selectedInvoice.customer.email && (
                    <div style={{ color: 'var(--cyber-text-muted)' }}>{selectedInvoice.customer.email}</div>
                  )}
                  {selectedInvoice.customer.vatNumber && (
                    <div style={{ color: 'var(--cyber-text-muted)' }}>VAT: {selectedInvoice.customer.vatNumber}</div>
                  )}
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">📋 INVOICE ITEMS</div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedInvoice.items.map((item, index) => (
                    <div key={index} style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      gap: '12px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                        {item.description}
                      </div>
                      <div style={{ color: 'var(--cyber-text-muted)', textAlign: 'center' }}>
                        {item.quantity}x
                      </div>
                      <div style={{ color: 'var(--cyber-text-muted)', textAlign: 'center' }}>
                        {formatCurrency(item.unitPrice)}
                      </div>
                      <div style={{ color: 'var(--neon-green)', fontWeight: '700', textAlign: 'right' }}>
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">💰 FINANCIAL BREAKDOWN</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--cyber-text)' }}>Subtotal:</span>
                    <span style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                      {formatCurrency(selectedInvoice.totals.subtotal)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--cyber-text)' }}>VAT ({selectedInvoice.totals.vatRate}%):</span>
                    <span style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                      {formatCurrency(selectedInvoice.totals.vatAmount)}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--cyber-border)',
                    marginTop: '8px'
                  }}>
                    <span style={{ color: 'var(--neon-green)', fontWeight: '700', fontSize: '18px' }}>TOTAL:</span>
                    <span style={{
                      color: 'var(--neon-green)',
                      fontWeight: '700',
                      fontSize: '18px',
                      textShadow: '0 0 10px currentColor'
                    }}>
                      {formatCurrency(selectedInvoice.totals.total)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="cyber-info-card">
                  <div className="cyber-info-header">📝 NOTES</div>
                  <div style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    color: 'var(--cyber-text)',
                    lineHeight: '1.5'
                  }}>
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                className="cyber-btn secondary"
                onClick={() => setSelectedInvoice(null)}
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

export default Invoices;
