import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usersAPI, salesAPI } from '../utils/api';
import { formatCurrency, formatDate, getRoleText } from '../utils/auth';

const MyTeam = () => {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState({
    myLeader: null,
    mySponsor: null,
    directReports: [],
    secondLevel: []
  });
  const [salesStats, setSalesStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month');

  useEffect(() => {
    loadMyTeamData();
  }, [user, timeFilter]);

  const loadMyTeamData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get all users to build relationships
      const usersResponse = await usersAPI.getUsers();
      const allUsers = usersResponse.data.users || [];

      // Get sales data for stats
      const salesParams = {
        ...(timeFilter !== 'all' && {
          startDate: getTimeFilterDate(),
          endDate: new Date().toISOString().split('T')[0]
        })
      };
      const salesResponse = await salesAPI.getSales(salesParams);
      const allSales = salesResponse.data.sales || [];

      // Find my leader/sponsor
      const myLeader = user.sponsorId ? allUsers.find(u => u._id === user.sponsorId) : null;
      const mySponsor = myLeader?.sponsorId ? allUsers.find(u => u._id === myLeader.sponsorId) : null;

      // Find my direct reports (Level 1)
      let directReports = allUsers.filter(u => u.sponsorId === user._id);

      // If user is Owner, also include users without any sponsor (auto-assign to Fyxed)
      if (user.role === 'owner') {
        const orphanedUsers = allUsers.filter(u =>
          !u.sponsorId &&
          u._id !== user._id &&
          u.role !== 'owner'
        );
        directReports = [...directReports, ...orphanedUsers];
      }

      // Find second level reports (Level 2)
      const secondLevel = [];
      directReports.forEach(directReport => {
        let theirReports = allUsers.filter(u => u.sponsorId === directReport._id);

        // If this direct report is a leader without sponsor (orphaned), also get their orphaned team
        if (!directReport.sponsorId && directReport.role === 'leader') {
          const orphanedUnderThisLeader = allUsers.filter(u =>
            !u.sponsorId &&
            u._id !== directReport._id &&
            u.role === 'agent'
          );
          theirReports = [...theirReports, ...orphanedUnderThisLeader];
        }

        secondLevel.push(...theirReports.map(report => ({
          ...report,
          throughLeader: directReport
        })));
      });

      // Calculate sales stats for each person
      const statsMap = {};

      [user, myLeader, mySponsor, ...directReports, ...secondLevel].forEach(person => {
        if (!person) return;

        const personSales = allSales.filter(sale =>
          sale.sellerId?._id === person._id || sale.sellerId === person._id
        );

        const totalRevenue = personSales.reduce((sum, sale) => sum + sale.amount, 0);
        const totalCommission = personSales.reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);

        // Calculate override commissions they earn from their team
        const overrideCommissions = allSales.reduce((sum, sale) => {
          let override = 0;
          if (sale.computed?.leaderId === person._id) override += sale.computed.leaderShare || 0;
          if (sale.computed?.sponsorId === person._id) override += sale.computed.sponsorShare || 0;
          return sum + override;
        }, 0);

        statsMap[person._id] = {
          salesCount: personSales.length,
          totalRevenue,
          totalCommission,
          overrideCommissions,
          totalEarnings: totalCommission + overrideCommissions
        };
      });

      setTeamData({
        myLeader,
        mySponsor,
        directReports,
        secondLevel
      });

      setSalesStats(statsMap);

    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo.toISOString().split('T')[0];
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
      case 'year':
        return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      default:
        return null;
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

  const renderPersonCard = (person, relationship, stats, extraInfo = null) => {
    if (!person) return null;

    return (
      <div className="cyber-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '32px', color: getRoleColor(person.role) }}>
            {getRoleIcon(person.role)}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--cyber-text)',
              marginBottom: '4px'
            }}>
              {person.name}
            </div>
            <div style={{
              fontSize: '12px',
              color: getRoleColor(person.role),
              textTransform: 'uppercase',
              fontWeight: '600',
              letterSpacing: '1px'
            }}>
              {getRoleText(person.role)} • {relationship}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
              {person.email}
            </div>
            {extraInfo && (
              <div style={{ fontSize: '11px', color: 'var(--neon-purple)', marginTop: '2px' }}>
                via {extraInfo.name}
              </div>
            )}
          </div>
        </div>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="cyber-info-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)', marginBottom: '4px' }}>
                SALES THIS {timeFilter.toUpperCase()}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--neon-blue)' }}>
                {stats.salesCount}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>
                {formatCurrency(stats.totalRevenue)}
              </div>
            </div>

            <div className="cyber-info-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)', marginBottom: '4px' }}>
                TOTAL EARNINGS
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--neon-green)' }}>
                {formatCurrency(stats.totalEarnings)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>
                Personal: {formatCurrency(stats.totalCommission)}
              </div>
            </div>

            {stats.overrideCommissions > 0 && (
              <div className="cyber-info-card" style={{ padding: '12px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)', marginBottom: '4px' }}>
                  OVERRIDE COMMISSIONS
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--neon-purple)' }}>
                  {formatCurrency(stats.overrideCommissions)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>
                  From team performance
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          LOADING MY TEAM DATA...
        </p>
      </div>
    );
  }

  const myStats = salesStats[user._id] || { salesCount: 0, totalRevenue: 0, totalCommission: 0, overrideCommissions: 0, totalEarnings: 0 };

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
            👥 MY TEAM HUB
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            YOUR PERSONAL HIERARCHY & COMMISSION NETWORK
          </p>
        </div>

        {/* Time Filter */}
        <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h3 className="neon-text" style={{ margin: 0 }}>⏰ PERFORMANCE PERIOD</h3>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['week', 'month', 'quarter', 'year', 'all'].map(period => (
                <button
                  key={period}
                  className={`cyber-btn ${timeFilter === period ? 'primary' : 'secondary'}`}
                  onClick={() => setTimeFilter(period)}
                  style={{ textTransform: 'uppercase' }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* My Position in Hierarchy */}
        <div style={{ marginBottom: '32px' }}>
          <h2 className="neon-text" style={{ marginBottom: '24px', fontSize: '24px' }}>
            📍 MY POSITION
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            {/* My Sponsor (Level +2) */}
            {teamData.mySponsor && (
              <div>
                <h4 style={{ color: 'var(--cyber-text)', marginBottom: '12px', fontSize: '14px' }}>
                  🏢 MY SPONSOR (LEVEL +2)
                </h4>
                {renderPersonCard(
                  teamData.mySponsor,
                  'SPONSOR',
                  salesStats[teamData.mySponsor._id]
                )}
              </div>
            )}

            {/* My Leader (Level +1) */}
            {teamData.myLeader && (
              <div>
                <h4 style={{ color: 'var(--cyber-text)', marginBottom: '12px', fontSize: '14px' }}>
                  ⭐ MY TEAM LEADER (LEVEL +1)
                </h4>
                {renderPersonCard(
                  teamData.myLeader,
                  'TEAM LEADER',
                  salesStats[teamData.myLeader._id]
                )}
              </div>
            )}

            {/* Me (Level 0) */}
            <div>
              <h4 style={{ color: 'var(--cyber-text)', marginBottom: '12px', fontSize: '14px' }}>
                🎯 ME (LEVEL 0)
              </h4>
              {renderPersonCard(user, 'MYSELF', myStats)}
            </div>
          </div>
        </div>

        {/* My Team Below Me */}
        {(teamData.directReports.length > 0 || teamData.secondLevel.length > 0) && (
          <div style={{ marginBottom: '32px' }}>
            <h2 className="neon-text" style={{ marginBottom: '24px', fontSize: '24px' }}>
              🌳 MY TEAM BELOW
            </h2>

            {/* Direct Reports (Level -1) */}
            {teamData.directReports.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ color: 'var(--cyber-text)', marginBottom: '16px', fontSize: '16px' }}>
                  👥 DIRECT REPORTS (LEVEL -1)
                  <span style={{
                    marginLeft: '12px',
                    fontSize: '12px',
                    color: 'var(--neon-green)',
                    background: 'rgba(0, 255, 163, 0.2)',
                    padding: '4px 8px',
                    borderRadius: '12px'
                  }}>
                    I earn 10% override from their sales
                  </span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {teamData.directReports.map(report =>
                    renderPersonCard(
                      report,
                      'DIRECT REPORT',
                      salesStats[report._id]
                    )
                  )}
                </div>
              </div>
            )}

            {/* Second Level (Level -2) */}
            {teamData.secondLevel.length > 0 && (
              <div>
                <h4 style={{ color: 'var(--cyber-text)', marginBottom: '16px', fontSize: '16px' }}>
                  🌐 SECOND LEVEL TEAM (LEVEL -2)
                  <span style={{
                    marginLeft: '12px',
                    fontSize: '12px',
                    color: 'var(--neon-purple)',
                    background: 'rgba(139, 92, 246, 0.2)',
                    padding: '4px 8px',
                    borderRadius: '12px'
                  }}>
                    I earn 10% sponsor override from their sales
                  </span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {teamData.secondLevel.map(report =>
                    renderPersonCard(
                      report,
                      'SECOND LEVEL',
                      salesStats[report._id],
                      report.throughLeader
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Commission Explanation */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '20px' }}>💰 COMMISSION STRUCTURE</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div className="cyber-info-card">
              <div className="cyber-info-header">🚀 MY SALES (50%)</div>
              <div className="cyber-info-content">
                <div style={{ color: 'var(--cyber-text)' }}>
                  I earn <strong style={{ color: 'var(--neon-green)' }}>50%</strong> commission from every sale I personally make.
                </div>
              </div>
            </div>

            {teamData.directReports.length > 0 && (
              <div className="cyber-info-card">
                <div className="cyber-info-header">👥 LEADER OVERRIDE (10%)</div>
                <div className="cyber-info-content">
                  <div style={{ color: 'var(--cyber-text)' }}>
                    I earn <strong style={{ color: 'var(--neon-green)' }}>10%</strong> override from my {teamData.directReports.length} direct reports' sales.
                  </div>
                </div>
              </div>
            )}

            {teamData.secondLevel.length > 0 && (
              <div className="cyber-info-card">
                <div className="cyber-info-header">🌐 SPONSOR OVERRIDE (10%)</div>
                <div className="cyber-info-content">
                  <div style={{ color: 'var(--cyber-text)' }}>
                    I earn <strong style={{ color: 'var(--neon-purple)' }}>10%</strong> sponsor override from my {teamData.secondLevel.length} second-level team's sales.
                  </div>
                </div>
              </div>
            )}

            <div className="cyber-info-card">
              <div className="cyber-info-header">🏛️ FYXED SHARE (30%+)</div>
              <div className="cyber-info-content">
                <div style={{ color: 'var(--cyber-text)' }}>
                  Fyxed keeps minimum <strong style={{ color: 'var(--cyber-text-muted)' }}>30%</strong> of every sale for company operations.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {teamData.directReports.length === 0 && teamData.secondLevel.length === 0 && (
          <div className="cyber-card" style={{ padding: '48px', textAlign: 'center', marginTop: '32px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌱</div>
            <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
              BUILD YOUR TEAM
            </h3>
            <p style={{ color: 'var(--cyber-text-muted)', marginBottom: '24px' }}>
              Start recruiting agents to work under you and earn override commissions from their sales!
            </p>
            {(user?.role === 'owner' || user?.role === 'leader') && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/users" className="cyber-btn">
                  👥 MANAGE USERS
                </a>
                <a href="/hierarchy" className="cyber-btn secondary">
                  🌳 VIEW FULL TREE
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTeam;