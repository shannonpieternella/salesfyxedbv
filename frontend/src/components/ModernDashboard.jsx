import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { salesAPI, usersAPI, invoicesAPI } from '../utils/api';
import { formatCurrency, formatDate, getRoleText } from '../utils/auth';

const ModernDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    metrics: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      personalEarnings: 0,
      overrideEarnings: 0,
      salesCount: 0,
      teamSize: 0,
      conversionRate: 0,
      growthRate: 0
    },
    recentActivity: [],
    topPerformers: [],
    quickStats: {
      pendingInvoices: 0,
      activeSales: 0,
      teamGrowth: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Calculate date ranges
      const now = new Date();
      const timeRanges = {
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getFullYear(), now.getMonth(), 1),
        quarter: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
        year: new Date(now.getFullYear(), 0, 1)
      };

      const startDate = timeRanges[timeRange];
      const prevStartDate = new Date(startDate);
      prevStartDate.setTime(startDate.getTime() - (now.getTime() - startDate.getTime()));

      // Load all data in parallel
      const [salesResponse, usersResponse, invoicesResponse, prevSalesResponse] = await Promise.all([
        salesAPI.getSales({
          startDate: startDate.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        }),
        usersAPI.getUsers(),
        invoicesAPI.getInvoices(),
        salesAPI.getSales({
          startDate: prevStartDate.toISOString().split('T')[0],
          endDate: startDate.toISOString().split('T')[0]
        })
      ]);

      const sales = salesResponse.data.sales || [];
      const allUsers = usersResponse.data.users || [];
      const invoices = invoicesResponse.data.invoices || [];
      const prevSales = prevSalesResponse.data.sales || [];

      // Calculate user's personal metrics
      const userSales = sales.filter(sale => sale.sellerId?._id === user._id || sale.sellerId === user._id);
      const personalRevenue = userSales.reduce((sum, sale) => sum + sale.amount, 0);
      const personalEarnings = userSales.reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);

      // Calculate override earnings (as leader/sponsor)
      const overrideEarnings = sales.reduce((sum, sale) => {
        let override = 0;
        if (sale.computed?.leaderId === user._id) override += sale.computed.leaderShare || 0;
        if (sale.computed?.sponsorId === user._id) override += sale.computed.sponsorShare || 0;
        return sum + override;
      }, 0);

      // Calculate team metrics
      const teamMembers = allUsers.filter(u => u.sponsorId === user._id);
      const teamSales = sales.filter(sale =>
        teamMembers.some(member => member._id === (sale.sellerId?._id || sale.sellerId))
      );

      // Calculate growth rate
      const prevPeriodRevenue = prevSales
        .filter(sale => sale.sellerId?._id === user._id || sale.sellerId === user._id)
        .reduce((sum, sale) => sum + sale.amount, 0);
      const growthRate = prevPeriodRevenue > 0 ?
        ((personalRevenue - prevPeriodRevenue) / prevPeriodRevenue * 100) :
        (personalRevenue > 0 ? 100 : 0);

      // Get recent activity
      const recentActivity = sales
        .filter(sale => sale.sellerId?._id === user._id || sale.sellerId === user._id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      // Calculate top performers in user's network
      const networkUsers = user.role === 'owner' ? allUsers :
        user.role === 'leader' ? [user, ...teamMembers] : [user];

      const performers = networkUsers.map(performer => {
        const performerSales = sales.filter(sale =>
          sale.sellerId?._id === performer._id || sale.sellerId === performer._id
        );
        const revenue = performerSales.reduce((sum, sale) => sum + sale.amount, 0);
        const earnings = performerSales.reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);

        return {
          ...performer,
          revenue,
          earnings,
          salesCount: performerSales.length
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // Quick stats
      const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;
      const activeSales = sales.filter(sale => sale.status === 'open' || sale.status === 'approved').length;

      setDashboardData({
        metrics: {
          totalRevenue: sales.reduce((sum, sale) => sum + sale.amount, 0),
          monthlyRevenue: personalRevenue,
          personalEarnings,
          overrideEarnings,
          salesCount: userSales.length,
          teamSize: teamMembers.length,
          conversionRate: userSales.length > 0 ? (userSales.filter(s => s.status === 'paid').length / userSales.length * 100) : 0,
          growthRate
        },
        recentActivity,
        topPerformers: performers,
        quickStats: {
          pendingInvoices,
          activeSales,
          teamGrowth: teamMembers.length
        }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return '👑';
      case 'leader': return '⭐';
      case 'agent': return '🚀';
      default: return '👤';
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

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          INITIALIZING COMMAND CENTER...
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cyber-dark)', padding: '20px 0' }}>
      <div className="container">
        {/* Hero Header */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'var(--accent-gradient)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: '0 0 30px rgba(75, 172, 254, 0.6)'
            }}>
              {getRoleIcon(user.role)}
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{
                fontSize: '36px',
                fontWeight: '700',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
                lineHeight: 1
              }}>
                Welcome back, {user.name}
              </h1>
              <p style={{
                color: 'var(--cyber-text-muted)',
                fontSize: '16px',
                margin: '4px 0 0 0',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {getRoleText(user.role)} • Command Center
              </p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div style={{
            display: 'inline-flex',
            gap: '8px',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            border: '1px solid var(--cyber-border)'
          }}>
            {['week', 'month', 'quarter', 'year'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: timeRange === range ? 'var(--accent-gradient)' : 'transparent',
                  color: timeRange === range ? 'white' : 'var(--cyber-text)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* Revenue Metric */}
          <div className="cyber-card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(75, 172, 254, 0.1), rgba(139, 92, 246, 0.1))',
            border: '1px solid rgba(75, 172, 254, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(75, 172, 254, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{
                  color: 'var(--cyber-text-muted)',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  margin: 0
                }}>
                  Revenue Generated
                </h3>
                <div style={{ fontSize: '24px' }}>💰</div>
              </div>

              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: 'var(--neon-blue)',
                textShadow: '0 0 20px currentColor',
                marginBottom: '8px'
              }}>
                {formatCurrency(dashboardData.metrics.monthlyRevenue)}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}>
                <span style={{
                  color: dashboardData.metrics.growthRate >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)',
                  fontWeight: '600'
                }}>
                  {dashboardData.metrics.growthRate >= 0 ? '↗️' : '↘️'} {Math.abs(dashboardData.metrics.growthRate).toFixed(1)}%
                </span>
                <span style={{ color: 'var(--cyber-text-muted)' }}>vs previous period</span>
              </div>
            </div>
          </div>

          {/* Personal Earnings */}
          <div className="cyber-card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(0, 255, 163, 0.1), rgba(34, 197, 94, 0.1))',
            border: '1px solid rgba(0, 255, 163, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(0, 255, 163, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{
                  color: 'var(--cyber-text-muted)',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  margin: 0
                }}>
                  My Earnings
                </h3>
                <div style={{ fontSize: '24px' }}>🚀</div>
              </div>

              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: 'var(--neon-green)',
                textShadow: '0 0 20px currentColor',
                marginBottom: '8px'
              }}>
                {formatCurrency(dashboardData.metrics.personalEarnings + dashboardData.metrics.overrideEarnings)}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                Personal: {formatCurrency(dashboardData.metrics.personalEarnings)} •
                Override: {formatCurrency(dashboardData.metrics.overrideEarnings)}
              </div>
            </div>
          </div>

          {/* Sales Performance */}
          <div className="cyber-card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1))',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{
                  color: 'var(--cyber-text-muted)',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  margin: 0
                }}>
                  Sales Closed
                </h3>
                <div style={{ fontSize: '24px' }}>📊</div>
              </div>

              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: 'var(--neon-purple)',
                textShadow: '0 0 20px currentColor',
                marginBottom: '8px'
              }}>
                {dashboardData.metrics.salesCount}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                {dashboardData.metrics.conversionRate.toFixed(1)}% conversion rate
              </div>
            </div>
          </div>

          {/* Team Size */}
          {dashboardData.metrics.teamSize > 0 && (
            <div className="cyber-card" style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(244, 113, 181, 0.1), rgba(219, 39, 119, 0.1))',
              border: '1px solid rgba(244, 113, 181, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-50%',
                width: '200%',
                height: '200%',
                background: 'radial-gradient(circle, rgba(244, 113, 181, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none'
              }}></div>

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{
                    color: 'var(--cyber-text-muted)',
                    fontSize: '14px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    margin: 0
                  }}>
                    Team Size
                  </h3>
                  <div style={{ fontSize: '24px' }}>👥</div>
                </div>

                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: 'var(--neon-pink)',
                  textShadow: '0 0 20px currentColor',
                  marginBottom: '8px'
                }}>
                  {dashboardData.metrics.teamSize}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                  Direct reports under you
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '32px', marginBottom: '40px' }}>
          {/* Recent Activity */}
          <div className="cyber-card" style={{ padding: '24px' }}>
            <h3 className="neon-text" style={{ marginBottom: '24px', fontSize: '20px' }}>
              🔥 Recent Activity
            </h3>

            {dashboardData.recentActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                <p style={{ color: 'var(--cyber-text-muted)' }}>No recent sales activity</p>
                <a href="/sales" className="cyber-btn" style={{ marginTop: '16px' }}>
                  Create First Sale
                </a>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {dashboardData.recentActivity.map(activity => (
                  <div key={activity._id} style={{
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--cyber-border)',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--cyber-text)', marginBottom: '4px' }}>
                        {activity.customer?.name || 'Unknown Client'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                        {formatDate(activity.createdAt)} • Status: {activity.status}
                      </div>
                    </div>
                    <div style={{
                      fontWeight: '700',
                      color: 'var(--neon-green)',
                      fontSize: '16px'
                    }}>
                      {formatCurrency(activity.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Performers */}
          <div className="cyber-card" style={{ padding: '24px' }}>
            <h3 className="neon-text" style={{ marginBottom: '24px', fontSize: '20px' }}>
              🏆 Top Performers
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {dashboardData.topPerformers.slice(0, 5).map((performer, index) => (
                <div key={performer._id} style={{
                  padding: '12px',
                  background: index === 0 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${index === 0 ? 'rgba(255, 215, 0, 0.3)' : 'var(--cyber-border)'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: getRoleColor(performer.role),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}>
                    {getRoleIcon(performer.role)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--cyber-text)', fontSize: '14px' }}>
                      {performer.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      {performer.salesCount} sales • {formatCurrency(performer.revenue)}
                    </div>
                  </div>

                  {index === 0 && (
                    <div style={{ fontSize: '20px' }}>🥇</div>
                  )}
                  {index === 1 && (
                    <div style={{ fontSize: '20px' }}>🥈</div>
                  )}
                  {index === 2 && (
                    <div style={{ fontSize: '20px' }}>🥉</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '24px', fontSize: '20px' }}>
            ⚡ Quick Actions
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <a href="/sales" className="cyber-btn" style={{
              padding: '16px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '20px' }}>🚀</span>
              Create New Sale
            </a>

            <a href="/invoices" className="cyber-btn secondary" style={{
              padding: '16px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '20px' }}>🧾</span>
              Generate Invoice
            </a>

            <a href="/earnings" className="cyber-btn secondary" style={{
              padding: '16px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '20px' }}>💎</span>
              View Earnings
            </a>

            {(user.role === 'owner' || user.role === 'leader') && (
              <a href="/hierarchy" className="cyber-btn secondary" style={{
                padding: '16px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '20px' }}>🌳</span>
                Team Overview
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;