import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usersAPI } from '../utils/api';
import { formatDate, getRoleText } from '../utils/auth';

const TransferHistory = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadTransferHistory();
  }, [filters]);

  const loadTransferHistory = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would call a dedicated transfers API
      // For now, we'll show a placeholder interface
      setTransfers([
        {
          id: '1',
          userId: 'user1',
          userName: 'Agent C',
          fromLeader: 'Leader A',
          toLeader: 'Leader B',
          transferDate: '2024-01-15T10:30:00Z',
          reason: 'Team restructuring',
          transferredBy: 'Admin Fyxed'
        }
      ]);
    } catch (error) {
      console.error('Error loading transfer history:', error);
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

  if (user?.role !== 'owner') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cyber-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cyber-card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
          <h2 style={{ color: 'var(--neon-pink)', marginBottom: '16px' }}>ACCESS DENIED</h2>
          <p style={{ color: 'var(--cyber-text-muted)' }}>Owner privileges required for transfer history</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          LOADING TRANSFER HISTORY...
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
            🔄 TRANSFER MATRIX
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            TEAM MOVEMENT & TRANSFER AUDIT LOG
          </p>
        </div>

        {/* Filters */}
        <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <h3 className="neon-text" style={{ marginBottom: '20px' }}>🔍 FILTER CONTROLS</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="cyber-label">USER</label>
              <select
                className="cyber-input"
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
              >
                <option value="">All Users</option>
                {/* This would be populated with actual users */}
              </select>
            </div>

            <div>
              <label className="cyber-label">FROM DATE</label>
              <input
                type="date"
                className="cyber-input"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="cyber-label">TO DATE</label>
              <input
                type="date"
                className="cyber-input"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <button
            onClick={() => setFilters({ userId: '', startDate: '', endDate: '' })}
            className="cyber-btn secondary"
          >
            🔄 RESET FILTERS
          </button>
        </div>

        {/* Transfer History Table */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '24px' }}>📡 TRANSFER DATABASE</h3>

          {transfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔄</div>
              <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
                NO TRANSFERS RECORDED
              </h3>
              <p style={{ color: 'var(--cyber-text-muted)' }}>
                Team transfers will be logged here for audit purposes
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="holo-table">
                <thead>
                  <tr>
                    <th>USER</th>
                    <th>FROM LEADER</th>
                    <th>TO LEADER</th>
                    <th>TRANSFER DATE</th>
                    <th>REASON</th>
                    <th>TRANSFERRED BY</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(transfer => (
                    <tr key={transfer.id}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                          {transfer.userName}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--neon-purple)' }}>
                          {transfer.fromLeader || 'No Leader'}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--neon-green)' }}>
                          {transfer.toLeader || 'No Leader'}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--cyber-text)' }}>
                          {formatDate(transfer.transferDate, 'datetime')}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--cyber-text-muted)' }}>
                          {transfer.reason}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--neon-blue)' }}>
                          {transfer.transferredBy}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Data Protection Notice */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '20px' }}>🛡️ DATA PROTECTION POLICY</h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="cyber-info-card">
              <div className="cyber-info-header">✅ PRESERVED DATA</div>
              <div className="cyber-info-content">
                <div style={{ color: 'var(--cyber-text)' }}>
                  • All historical sales records remain intact<br/>
                  • Previous commission calculations are preserved<br/>
                  • Performance history stays with the user<br/>
                  • Earnings history is maintained
                </div>
              </div>
            </div>

            <div className="cyber-info-card">
              <div className="cyber-info-header">🔄 WHAT CHANGES</div>
              <div className="cyber-info-content">
                <div style={{ color: 'var(--cyber-text)' }}>
                  • Future sales generate commissions for new leader<br/>
                  • Team hierarchy updates immediately<br/>
                  • New reporting relationships established<br/>
                  • Commission flow redirects to new structure
                </div>
              </div>
            </div>

            <div className="cyber-info-card">
              <div className="cyber-info-header">📊 AUDIT TRAIL</div>
              <div className="cyber-info-content">
                <div style={{ color: 'var(--cyber-text)' }}>
                  • Every transfer is logged with timestamp<br/>
                  • Admin approval required for all transfers<br/>
                  • Reason tracking for compliance<br/>
                  • Complete history maintained indefinitely
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferHistory;