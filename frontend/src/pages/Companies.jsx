import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const Companies = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    phase: '',
    q: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, [filters]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = {};
      if (filters.phase) params.phase = filters.phase;
      if (filters.q) params.q = filters.q;
      params.page = filters.page;
      params.limit = filters.limit;

      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setCompanies(response.data.companies || []);
      setPagination(response.data.pagination || {});
      setLoading(false);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setLoading(false);
    }
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`,
        {
          name: formData.get('name'),
          contactPerson: formData.get('contactPerson'),
          phone: formData.get('phone'),
          email: formData.get('email'),
          website: formData.get('website'),
          priority: parseInt(formData.get('priority') || 3),
          goals: {
            primary: formData.get('goal') || 'LEADS'
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowAddModal(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error adding company:', error);
      alert('Error adding company: ' + (error.response?.data?.error || error.message));
    }
  };

  const phaseConfig = {
    leadlist: { label: 'Lead List', icon: '📋', color: '#4BACFE' },
    research: { label: 'Research', icon: '🔍', color: '#00D4FF' },
    contact: { label: 'Contact', icon: '📞', color: '#7B61FF' },
    present_finetune: { label: 'Presentation', icon: '🎯', color: '#F471B5' },
    deal: { label: 'Deal', icon: '💰', color: '#00FFA3' }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px'
            }}>
              🏢 Companies
            </h1>
            <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
              {pagination.total || 0} companies total
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '18px' }}>➕</span>
            New Company
          </button>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--cyber-text-muted)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Company name..."
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--cyber-border)',
                  borderRadius: '8px',
                  color: 'var(--cyber-text)',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--cyber-text-muted)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Phase
              </label>
              <select
                value={filters.phase}
                onChange={(e) => setFilters({ ...filters, phase: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--cyber-border)',
                  borderRadius: '8px',
                  color: 'var(--cyber-text)',
                  fontSize: '14px'
                }}
              >
                <option value="">All phases</option>
                {Object.entries(phaseConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Companies List */}
        {loading ? (
          <div className="card">
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading companies...</p>
            </div>
          </div>
        ) : companies.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--cyber-text)' }}>No companies found</h3>
            <p style={{ color: 'var(--cyber-text-muted)', marginBottom: '24px' }}>
              {filters.q || filters.phase ? 'Try different filters' : 'Add your first company to get started'}
            </p>
            {!filters.q && !filters.phase && (
              <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                Add New Company
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {companies.map(company => (
              <Link
                key={company._id}
                to={`/companies/${company._id}`}
                className="card"
                style={{
                  textDecoration: 'none',
                  color: 'var(--cyber-text)',
                  transition: 'var(--transition-smooth)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--neon-blue)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(75, 172, 254, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--cyber-border)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '24px',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      fontSize: '32px',
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `${phaseConfig[company.currentPhase]?.color}20`,
                      borderRadius: '12px',
                      border: `1px solid ${phaseConfig[company.currentPhase]?.color}40`
                    }}>
                      {phaseConfig[company.currentPhase]?.icon || '📋'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '4px',
                        color: 'var(--cyber-text)'
                      }}>
                        {company.name}
                      </h3>
                      <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '13px',
                        color: 'var(--cyber-text-muted)'
                      }}>
                        {company.contactPerson && (
                          <span>👤 {company.contactPerson}</span>
                        )}
                        {company.email && (
                          <span>✉️ {company.email}</span>
                        )}
                        {company.phone && (
                          <span>📞 {company.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {company.priority && (
                      <div style={{
                        padding: '4px 12px',
                        background: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#FFC107'
                      }}>
                        P{company.priority}
                      </div>
                    )}
                    <div style={{
                      padding: '6px 16px',
                      background: `${phaseConfig[company.currentPhase]?.color}20`,
                      border: `1px solid ${phaseConfig[company.currentPhase]?.color}40`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: phaseConfig[company.currentPhase]?.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}>
                      {phaseConfig[company.currentPhase]?.label || company.currentPhase}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '24px'
          }}>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page === 1}
              className="btn"
              style={{ opacity: filters.page === 1 ? 0.5 : 1 }}
            >
              ← Previous
            </button>
            <div style={{
              padding: '8px 16px',
              background: 'var(--cyber-card)',
              border: '1px solid var(--cyber-border)',
              borderRadius: '8px',
              color: 'var(--cyber-text)',
              fontSize: '14px'
            }}>
              Page {filters.page} of {pagination.pages}
            </div>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page === pagination.pages}
              className="btn"
              style={{ opacity: filters.page === pagination.pages ? 0.5 : 1 }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Add Company Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div className="card" style={{
              maxWidth: '600px',
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
                Add New Company
              </h2>

              <form onSubmit={handleAddCompany}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="form-label">Company Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="form-input"
                      placeholder="TechStart Inc"
                    />
                  </div>

                  <div>
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      name="contactPerson"
                      className="form-input"
                      placeholder="John Doe"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        name="email"
                        className="form-input"
                        placeholder="john@techstart.com"
                      />
                    </div>
                    <div>
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        className="form-input"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Website</label>
                    <input
                      type="url"
                      name="website"
                      className="form-input"
                      placeholder="https://techstart.com"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="form-label">Priority</label>
                      <select name="priority" className="form-input" defaultValue="3">
                        <option value="1">1 - Low</option>
                        <option value="2">2</option>
                        <option value="3">3 - Medium</option>
                        <option value="4">4</option>
                        <option value="5">5 - High</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Goal</label>
                      <select name="goal" className="form-input">
                        <option value="LEADS">More Leads</option>
                        <option value="REVENUE">More Revenue</option>
                        <option value="EFFICIENCY">More Efficiency</option>
                      </select>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '8px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="btn"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Companies;
