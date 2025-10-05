import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const AnalyticsSteps = () => {
  const { user } = useAuth();
  const [funnel, setFunnel] = useState(null);
  const [durations, setDurations] = useState(null);
  const [contactMethods, setContactMethods] = useState(null);
  const [agents, setAgents] = useState(null);
  const [savings, setSavings] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [agentFilter]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const qs = (user?.role === 'admin' || user?.role === 'owner') && agentFilter ? `?agentId=${agentFilter}` : '';

      const [funnelRes, durationsRes, methodsRes, agentsRes, savingsRes, checklistRes] = await Promise.all([
        axios.get(`${baseURL}/api/analytics-steps/funnel${qs}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseURL}/api/analytics-steps/durations${qs}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseURL}/api/analytics-steps/contact-methods${qs}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        (user?.role === 'admin' || user?.role === 'owner')
          ? axios.get(`${baseURL}/api/analytics-steps/agents`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          : Promise.resolve({ data: null }),
        axios.get(`${baseURL}/api/analytics-steps/savings${qs}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseURL}/api/analytics-steps/checklist${qs}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setFunnel(funnelRes.data);
      setDurations(durationsRes.data);
      setContactMethods(methodsRes.data);
      setAgents(agentsRes.data);
      setSavings(savingsRes.data);
      setChecklist(checklistRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const phaseColors = {
    leadlist: '#4BACFE',
    research: '#00D4FF',
    contact: '#7B61FF',
    present_finetune: '#F471B5',
    deal: '#00FFA3'
  };

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px'
          }}>
            📈 Analytics Dashboard
          </h1>
          <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
            Insights into your sales performance{(user?.role === 'admin' || user?.role === 'owner') && agentFilter && agents ? ` — Agent: ${(agents.find(a => a.agentId === agentFilter)?.agentName) || 'Unknown'}` : ''}
          </p>
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ color: 'var(--cyber-text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Agent</label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                style={{ padding: '8px 12px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', color: '#333', fontSize: '14px' }}
              >
                <option value="">All Agents</option>
                {(agents || []).map(a => (
                  <option key={a.agentId} value={a.agentId}>{a.agentName} ({a.agentEmail})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Funnel Metrics */}
        {funnel && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--cyber-text)'
            }}>
              🎯 Sales Funnel
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              {Object.entries(funnel.phaseCounts).map(([phase, count]) => (
                <div
                  key={phase}
                  className="card"
                  style={{
                    background: `${phaseColors[phase]}10`,
                    border: `1px solid ${phaseColors[phase]}40`
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--cyber-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '8px'
                  }}>
                    {phase}
                  </div>
                  <div style={{
                    fontSize: '36px',
                    fontWeight: '700',
                    color: phaseColors[phase],
                    textShadow: `0 0 20px ${phaseColors[phase]}40`
                  }}>
                    {count}
                  </div>
                </div>
              ))}
            </div>

            {/* Conversions */}
            <div className="card">
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: 'var(--cyber-text)'
              }}>
                📊 Conversion Rates
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {Object.entries(funnel.conversions).map(([key, value]) => (
                  <div key={key}>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--cyber-text-muted)',
                      marginBottom: '4px',
                      textTransform: 'capitalize'
                    }}>
                      {key.replace(/_/g, ' → ')}
                    </div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: 'var(--neon-blue)'
                    }}>
                      {value}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deal Results */}
            <div className="card" style={{ marginTop: '16px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: 'var(--cyber-text)'
              }}>
                💰 Deal Results
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px'
              }}>
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 255, 163, 0.1)',
                  border: '1px solid rgba(0, 255, 163, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>WON</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#00FFA3' }}>
                    {funnel.dealResults.WON || 0}
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>LOST</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#F44336' }}>
                    {funnel.dealResults.LOST || 0}
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>PENDING</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFC107' }}>
                    {funnel.dealResults.PENDING || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Durations */}
        {durations && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--cyber-text)'
              }}>
              ⏱️ Cycle Times (days)
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {Object.entries(durations).map(([phase, data]) => (
                <div key={phase} className="card">
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--cyber-text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    {phase}
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: phaseColors[phase],
                    marginBottom: '8px'
                  }}>
                    {data.avg} days
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--cyber-text-muted)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px'
                  }}>
                    <div>Min: {data.min}d</div>
                    <div>Max: {data.max}d</div>
                    <div>Median: {data.median}d</div>
                    <div>Count: {data.count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Methods */}
        {contactMethods && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--cyber-text)'
              }}>
              📞 Contact Method Effectiveness
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {Object.entries(contactMethods).map(([method, data]) => (
                <div key={method} className="card">
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: 'var(--cyber-text)'
                  }}>
                    {method === 'COLD_CALL' ? '📞 Cold Call' :
                     method === 'EMAIL' ? '✉️ Email' : '🤝 In-Person'}
                  </div>
                  <div style={{
                    display: 'grid',
                    gap: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}>
                      <span style={{ color: 'var(--cyber-text-muted)' }}>Attempts</span>
                      <span style={{ fontWeight: '600' }}>{data.attempts}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}>
                      <span style={{ color: 'var(--cyber-text-muted)' }}>Connected</span>
                      <span style={{ fontWeight: '600' }}>{data.connected}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}>
                      <span style={{ color: 'var(--cyber-text-muted)' }}>Connect Rate</span>
                      <span style={{ fontWeight: '600', color: 'var(--neon-blue)' }}>{data.connectRate}%</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}>
                      <span style={{ color: 'var(--cyber-text-muted)' }}>Companies</span>
                      <span style={{ fontWeight: '600' }}>{data.companiesUsed}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}>
                      <span style={{ color: 'var(--cyber-text-muted)' }}>Won</span>
                      <span style={{ fontWeight: '600', color: 'var(--neon-green)' }}>{data.won}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}>
                      <span style={{ color: 'var(--cyber-text-muted)' }}>Win Rate</span>
                      <span style={{ fontWeight: '600', color: 'var(--neon-green)' }}>{data.winRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist Bottlenecks */}
        {checklist && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--cyber-text)'
            }}>
              ✅ Checklist Bottlenecks
            </h2>
            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--cyber-text)' }}>
                Overall by Step
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                {checklist.byStep.map(s => (
                  <div key={s.stepKey} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--cyber-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', textTransform: 'uppercase' }}>
                      {s.stepKey}
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--neon-blue)' }}>
                      {s.completionRate.toFixed ? s.completionRate.toFixed(1) : s.completionRate}%
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      {s.completed}/{s.total} completed
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--cyber-text)' }}>
                  Per Agent Overview
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--cyber-border)', textAlign: 'left' }}>
                        <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Agent</th>
                        <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Completion</th>
                        <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Total</th>
                        <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>By Step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(checklist?.perAgent || [])
                        .slice()
                        .sort((a, b) => a.completionRate - b.completionRate)
                        .filter(a => !agentFilter || a.agentId === agentFilter)
                        .map(a => (
                        <tr key={a.agentId} style={{ borderBottom: '1px solid var(--cyber-border)' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600' }}>{a.agentName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>{a.agentEmail}</div>
                          </td>
                          <td style={{ padding: '12px', color: 'var(--neon-blue)' }}>
                            {(a.completionRate || 0).toFixed(1)}%
                          </td>
                          <td style={{ padding: '12px' }}>
                            {a.completed}/{a.total}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {a.steps.map(s => (
                                <span key={s.stepKey} style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', border: '1px solid var(--cyber-border)', borderRadius: '6px', padding: '2px 6px' }}>
                                  {s.stepKey}: {s.completed}/{s.total}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Savings */}
        {savings && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--cyber-text)'
              }}>
              💰 ROI & Savings
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              <div className="card">
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: 'var(--cyber-text)'
                }}>
                  📊 Total Overview
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      Companies with savings
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--neon-blue)' }}>
                      {savings.total.companiesWithSavings}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      Total time saved (hours/month)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--neon-blue)' }}>
                      {savings.total.totalTimeHoursPerMonth}h
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      Total cost savings (EUR/month)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--neon-green)' }}>
                      €{savings.total.totalCostPerMonth}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: 'var(--cyber-text)'
                }}>
                  🏆 Won Deals
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      Number of WON deals
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--neon-green)' }}>
                      {savings.wonDeals.count}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      Avg time saved (hours/month)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--neon-blue)' }}>
                      {savings.wonDeals.avgTimeHoursPerMonth}h
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      Avg cost savings (EUR/month)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--neon-green)' }}>
                      €{savings.wonDeals.avgCostPerMonth}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agent Performance (Admin only) */}
        {user?.role === 'admin' && agents && (
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--cyber-text)'
            }}>
              👥 Agent Performance
            </h2>
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '14px' }}>
                  <thead>
                    <tr style={{
                      borderBottom: '1px solid var(--cyber-border)',
                      textAlign: 'left'
                    }}>
                      <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Agent</th>
                      <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Companies</th>
                      <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Won</th>
                      <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Lost</th>
                      <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Win Rate</th>
                      <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Avg Deal</th>
                      <th style={{ padding: '12px', color: 'var(--cyber-text-muted)' }}>Cycle Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(agent => (
                      <tr key={agent.agentId} style={{
                        borderBottom: '1px solid var(--cyber-border)'
                      }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '600' }}>{agent.agentName}</div>
                          <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                            {agent.agentEmail}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>{agent.companiesCreated}</td>
                        <td style={{ padding: '12px', color: 'var(--neon-green)' }}>{agent.won}</td>
                        <td style={{ padding: '12px', color: '#F44336' }}>{agent.lost}</td>
                        <td style={{ padding: '12px', color: 'var(--neon-blue)' }}>{agent.winRate}%</td>
                        <td style={{ padding: '12px' }}>€{agent.avgDealValue}</td>
                        <td style={{ padding: '12px' }}>{agent.avgCycleTime}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsSteps;
