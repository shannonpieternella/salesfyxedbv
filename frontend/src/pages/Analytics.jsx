import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const Analytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      const endpoint = user?.role === 'owner' ? '/api/analytics/admin' : '/api/analytics/user';
      const response = await fetch(`${endpoint}?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="card text-center">
            <h2>Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="card text-center">
            <h2>No analytics available</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>📊 {user?.role === 'owner' ? 'Admin' : 'My'} Analytics</h1>
          <div className="timeframe-selector">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="form-control"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="analytics-summary">
          <div className="summary-card">
            <div className="summary-icon">📞</div>
            <div className="summary-content">
              <div className="summary-number">{analytics.summary.totalCalls}</div>
              <div className="summary-label">Total Calls</div>
            </div>
          </div>

          <div className="summary-card highlight">
            <div className="summary-icon">⏱️</div>
            <div className="summary-content">
              <div className="summary-number">{analytics.summary.totalMinutes}</div>
              <div className="summary-label">Total Minutes</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">💰</div>
            <div className="summary-content">
              <div className="summary-number">€{analytics.summary.totalCost ? analytics.summary.totalCost.toFixed(2) : '0.00'}</div>
              <div className="summary-label">{user?.role === 'owner' ? 'Total Revenue' : 'Total Cost'}</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">📈</div>
            <div className="summary-content">
              <div className="summary-number">{analytics.summary.averageCallDuration}</div>
              <div className="summary-label">Avg Minutes/Call</div>
            </div>
          </div>

          {user?.role === 'owner' && (
            <>
              <div className="summary-card">
                <div className="summary-icon">👥</div>
                <div className="summary-content">
                  <div className="summary-number">{analytics.summary.activeUsers}</div>
                  <div className="summary-label">Active Users</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon">🤖</div>
                <div className="summary-content">
                  <div className="summary-number">{analytics.summary.activeAgents}</div>
                  <div className="summary-label">Active Agents</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Agent Statistics */}
        <div className="analytics-section">
          <h3>📱 Agent Statistics</h3>
          <div className="analytics-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Calls</th>
                  <th>Minutes</th>
                  <th>Cost</th>
                  <th>Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {analytics.agentStats.map((agent, index) => (
                  <tr key={index}>
                    <td><strong>{agent.name}</strong></td>
                    <td>{agent.calls}</td>
                    <td><span className="highlight-minutes">{agent.minutes}m</span></td>
                    <td><span className="cost-highlight">€{agent.cost.toFixed(2)}</span></td>
                    <td>{agent.calls > 0 ? Math.round(agent.minutes / agent.calls * 10) / 10 : 0}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Statistics (Admin only) */}
        {user?.role === 'owner' && analytics.userStats?.length > 0 && (
          <div className="analytics-section">
            <h3>👥 User Statistics (Top 20)</h3>
            <div className="analytics-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Calls</th>
                    <th>Minutes</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.userStats.map((userStat, index) => (
                    <tr key={index}>
                      <td><strong>{userStat.name}</strong></td>
                      <td>{userStat.email}</td>
                      <td>{userStat.calls}</td>
                      <td><span className="highlight-minutes">{userStat.minutes}m</span></td>
                      <td><span className="cost-highlight">€{userStat.cost.toFixed(2)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Calls */}
        <div className="analytics-section">
          <h3>📋 Recent Calls</h3>
          <div className="analytics-table">
            <table className="table">
              <thead>
                <tr>
                  {user?.role === 'owner' && <th>User</th>}
                  <th>Agent</th>
                  <th>Phone Number</th>
                  <th>Duration & Cost</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentCalls.map((call) => (
                  <tr key={call.id}>
                    {user?.role === 'owner' && <td>{call.user}</td>}
                    <td>{call.agent}</td>
                    <td>{call.phoneNumber}</td>
                    <td>
                      <div className="duration-cost-display">
                        <span className="duration-badge">{call.minutes || 0}m</span>
                        <span className="cost-badge">€{call.cost ? call.cost.toFixed(2) : '0.00'}</span>
                        <div className="duration-detail">{formatDuration(call.duration)}</div>
                      </div>
                    </td>
                    <td>{formatDate(call.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart Data Summary */}
        {analytics.chartData?.length > 0 && (
          <div className="analytics-section">
            <h3>📈 Daily Trend (Last {timeframe} days)</h3>
            <div className="chart-summary">
              {analytics.chartData.slice(-7).map((day) => (
                <div key={day.date} className="day-summary">
                  <div className="day-date">{new Date(day.date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })}</div>
                  <div className="day-stats">
                    <div className="day-stat">
                      <span className="stat-value">{day.calls}</span>
                      <span className="stat-label">calls</span>
                    </div>
                    <div className="day-stat highlight">
                      <span className="stat-value">{day.minutes}</span>
                      <span className="stat-label">min</span>
                    </div>
                    <div className="day-stat">
                      <span className="stat-value">€{day.cost.toFixed(0)}</span>
                      <span className="stat-label">cost</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
