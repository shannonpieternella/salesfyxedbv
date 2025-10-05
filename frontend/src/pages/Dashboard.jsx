import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    byPhase: {
      leadlist: 0,
      research: 0,
      contact: 0,
      present_finetune: 0,
      deal: 0
    },
    total: 0,
    recentCompanies: []
  });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    fetchDashboardData();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Fetch companies
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 5, sort: '-createdAt' }
      });

      const companies = response.data.companies || [];

      // Calculate stats
      const byPhase = {
        leadlist: 0,
        research: 0,
        contact: 0,
        present_finetune: 0,
        deal: 0
      };

      companies.forEach(company => {
        if (byPhase[company.currentPhase] !== undefined) {
          byPhase[company.currentPhase]++;
        }
      });

      setStats({
        byPhase,
        total: response.data.pagination?.total || companies.length,
        recentCompanies: companies.slice(0, 5)
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const phaseConfig = {
    leadlist: { label: 'Lead List', icon: '📋', color: '#4BACFE' },
    research: { label: 'Research', icon: '🔍', color: '#00D4FF' },
    contact: { label: 'Contact', icon: '📞', color: '#7B61FF' },
    present_finetune: { label: 'Presentation', icon: '🎯', color: '#F471B5' },
    deal: { label: 'Deal', icon: '💰', color: '#00FFA3' }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
          <h1 style={{
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: '700',
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px'
          }}>
            Dashboard
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: isMobile ? '12px' : '14px'
          }}>
            Welcome back, {user?.name}! Here's your overview.
          </p>
        </div>

        {/* Phase Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: isMobile ? '12px' : '16px',
          marginBottom: isMobile ? '24px' : '32px'
        }}>
          {Object.entries(phaseConfig).map(([key, config]) => (
            <div
              key={key}
              className="card"
              style={{
                background: 'var(--cyber-card)',
                border: `1px solid ${config.color}20`,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                fontSize: '80px',
                opacity: 0.1
              }}>
                {config.icon}
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--cyber-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '8px'
                }}>
                  {config.label}
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: config.color,
                  textShadow: `0 0 20px ${config.color}40`
                }}>
                  {stats.byPhase[key]}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total & Recent Companies */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: isMobile ? '16px' : '24px'
        }}>
          {/* Total Companies Card */}
          <div className="card">
            <h3 style={{
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: '600',
              marginBottom: isMobile ? '12px' : '16px',
              color: 'var(--cyber-text)'
            }}>
              📊 Total Overview
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '12px' : '16px',
              marginBottom: isMobile ? '16px' : '24px'
            }}>
              <div style={{
                fontSize: isMobile ? '36px' : '48px',
                fontWeight: '700',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {stats.total}
              </div>
              <div>
                <div style={{
                  color: 'var(--cyber-text)',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  Companies
                </div>
                <div style={{
                  color: 'var(--cyber-text-muted)',
                  fontSize: isMobile ? '11px' : '12px'
                }}>
                  Total
                </div>
              </div>
            </div>
            <Link
              to="/companies"
              className="btn btn-primary"
              style={{
                width: '100%',
                fontSize: isMobile ? '13px' : '14px',
                padding: isMobile ? '10px' : '12px'
              }}
            >
              View All Companies
            </Link>
          </div>

          {/* Recent Companies */}
          <div className="card" style={{ gridColumn: isMobile ? '1' : 'span 2' }}>
            <h3 style={{
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: '600',
              marginBottom: isMobile ? '12px' : '16px',
              color: 'var(--cyber-text)'
            }}>
              🕒 Recent Companies
            </h3>
            {stats.recentCompanies.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: 'var(--cyber-text-muted)'
              }}>
                <p>No companies yet.</p>
                <Link to="/companies" className="btn btn-primary" style={{ marginTop: '16px' }}>
                  Add your first company
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.recentCompanies.map(company => (
                  <Link
                    key={company._id}
                    to={`/companies/${company._id}`}
                    style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'stretch' : 'center',
                      justifyContent: 'space-between',
                      padding: isMobile ? '12px' : '12px 16px',
                      gap: isMobile ? '12px' : '16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--cyber-border)',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'var(--cyber-text)',
                      transition: 'var(--transition-smooth)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(75, 172, 254, 0.1)';
                      e.currentTarget.style.borderColor = 'var(--neon-blue)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--cyber-border)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flex: 1,
                      minWidth: 0
                    }}>
                      <div style={{
                        fontSize: isMobile ? '20px' : '24px',
                        flexShrink: 0
                      }}>
                        {phaseConfig[company.currentPhase]?.icon || '📋'}
                      </div>
                      <div style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          fontSize: isMobile ? '13px' : '14px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {company.name}
                        </div>
                        <div style={{
                          fontSize: isMobile ? '11px' : '12px',
                          color: 'var(--cyber-text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {company.contactPerson || 'No contact person'}
                        </div>
                        <div style={{
                          fontSize: isMobile ? '10px' : '12px',
                          color: 'var(--cyber-text-muted)',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: isMobile ? 'normal' : 'nowrap'
                        }}>
                          👤 Agent: {company.agentId?.name || 'Unknown'}{!isMobile && company.agentId?.email ? ` (${company.agentId.email})` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: isMobile ? '6px 12px' : '4px 12px',
                      background: `${phaseConfig[company.currentPhase]?.color}20`,
                      border: `1px solid ${phaseConfig[company.currentPhase]?.color}40`,
                      borderRadius: '6px',
                      fontSize: isMobile ? '10px' : '11px',
                      fontWeight: '600',
                      color: phaseConfig[company.currentPhase]?.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      alignSelf: isMobile ? 'flex-start' : 'center'
                    }}>
                      {phaseConfig[company.currentPhase]?.label || company.currentPhase}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
