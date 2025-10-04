import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { salesAPI } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/auth';

const Earnings = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    salesCount: 0,
    averageCommission: 0,
    monthlyData: []
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadEarningsData();
  }, [timeRange, selectedMonth, selectedYear]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);

      // Get sales data for current user
      const salesResponse = await salesAPI.getSales({
        sellerId: user._id,
        ...(timeRange === 'month' && {
          startDate: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`,
          endDate: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-31`
        })
      });

      const sales = salesResponse.data.sales || [];
      setTransactions(sales);

      // Calculate earnings
      const totalEarnings = sales.reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);
      const paidEarnings = sales
        .filter(sale => sale.status === 'paid')
        .reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);
      const pendingEarnings = sales
        .filter(sale => sale.status !== 'paid')
        .reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);

      // Current month calculations
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const thisMonthSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.getMonth() + 1 === currentMonth && saleDate.getFullYear() === currentYear;
      });
      const thisMonth = thisMonthSales.reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);

      // Last month calculations
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const lastMonthSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.getMonth() + 1 === lastMonth && saleDate.getFullYear() === lastMonthYear;
      });
      const lastMonthEarnings = lastMonthSales.reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);

      // Generate monthly data for chart
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        const monthSales = sales.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          return saleDate.getMonth() + 1 === month && saleDate.getFullYear() === year;
        });

        monthlyData.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          earnings: monthSales.reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0),
          sales: monthSales.length
        });
      }

      setEarnings({
        totalEarnings,
        thisMonth,
        lastMonth: lastMonthEarnings,
        pendingEarnings,
        paidEarnings,
        salesCount: sales.length,
        averageCommission: sales.length > 0 ? totalEarnings / sales.length : 0,
        monthlyData
      });

    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGrowthPercentage = () => {
    if (earnings.lastMonth === 0) return earnings.thisMonth > 0 ? 100 : 0;
    return ((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth * 100).toFixed(1);
  };

  const getGrowthColor = () => {
    const growth = getGrowthPercentage();
    return growth >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)';
  };

  const maxEarnings = Math.max(...earnings.monthlyData.map(d => d.earnings));

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          LOADING EARNINGS DATA...
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
            💎 EARNINGS MATRIX
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            ADVANCED COMMISSION ANALYSIS SYSTEM
          </p>
        </div>

        {/* Controls */}
        <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 className="neon-text" style={{ margin: 0 }}>🔍 TIME RANGE CONTROLS</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label className="cyber-label">VIEW MODE</label>
              <select
                className="cyber-input"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="month">Specific Month</option>
                <option value="year">Current Year</option>
              </select>
            </div>

            {timeRange === 'month' && (
              <>
                <div>
                  <label className="cyber-label">MONTH</label>
                  <select
                    className="cyber-input"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <option key={2024 - i} value={2024 - i}>
                        {2024 - i}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
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
                TOTAL EARNINGS
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
            <div className="metric-value">{formatCurrency(earnings.totalEarnings)}</div>
            <div className="metric-label">{earnings.salesCount} SALES GENERATED</div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: '95%' }}
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
                THIS MONTH
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
              {formatCurrency(earnings.thisMonth)}
            </div>
            <div className="metric-label" style={{ color: getGrowthColor() }}>
              {getGrowthPercentage() >= 0 ? '↗️' : '↘️'} {Math.abs(getGrowthPercentage())}% VS LAST MONTH
            </div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{
                  width: `${earnings.lastMonth > 0 ? Math.min((earnings.thisMonth / earnings.lastMonth) * 100, 100) : 50}%`,
                  background: getGrowthPercentage() >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)'
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
                PAID OUT
              </span>
              <span style={{
                fontSize: '32px',
                color: 'var(--neon-blue)'
              }}>
                💰
              </span>
            </div>
            <div className="metric-value" style={{
              background: 'linear-gradient(135deg, var(--neon-blue), #0ea5e9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {formatCurrency(earnings.paidEarnings)}
            </div>
            <div className="metric-label">
              {earnings.totalEarnings > 0 ? ((earnings.paidEarnings / earnings.totalEarnings) * 100).toFixed(1) : 0}% OF TOTAL
            </div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{ width: `${earnings.totalEarnings > 0 ? (earnings.paidEarnings / earnings.totalEarnings) * 100 : 0}%` }}
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
              {formatCurrency(earnings.pendingEarnings)}
            </div>
            <div className="metric-label">AWAITING APPROVAL</div>
            <div className="cyber-progress" style={{ marginTop: '12px' }}>
              <div
                className="cyber-progress-bar"
                style={{
                  width: `${earnings.totalEarnings > 0 ? (earnings.pendingEarnings / earnings.totalEarnings) * 100 : 0}%`,
                  background: 'var(--neon-purple)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '32px' }}>
          {/* Monthly Earnings Chart */}
          <div className="cyber-card" style={{ padding: '24px' }}>
            <h3 className="neon-text" style={{ marginBottom: '24px' }}>📈 EARNINGS TIMELINE</h3>

            <div style={{
              display: 'flex',
              alignItems: 'end',
              gap: '16px',
              height: '300px',
              padding: '20px 0',
              position: 'relative'
            }}>
              {earnings.monthlyData.map((data, index) => (
                <div key={index} style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%'
                }}>
                  <div style={{
                    background: 'var(--accent-gradient)',
                    width: '40px',
                    height: `${maxEarnings > 0 ? (data.earnings / maxEarnings) * 250 : 0}px`,
                    borderRadius: '8px 8px 0 0',
                    marginBottom: '8px',
                    position: 'relative',
                    boxShadow: '0 0 20px rgba(75, 172, 254, 0.5)',
                    display: 'flex',
                    alignItems: 'end',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-30px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: 'var(--neon-blue)',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatCurrency(data.earnings)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--cyber-text)',
                    textTransform: 'uppercase'
                  }}>
                    {data.month}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--cyber-text-muted)'
                  }}>
                    {data.sales} sales
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="cyber-card" style={{ padding: '24px' }}>
            <h3 className="neon-text" style={{ marginBottom: '24px' }}>⚡ QUICK STATS</h3>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">💰 AVG COMMISSION</div>
                <div className="cyber-info-content">
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: 'var(--neon-green)',
                    textShadow: '0 0 10px currentColor'
                  }}>
                    {formatCurrency(earnings.averageCommission)}
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">🎯 COMMISSION RATE</div>
                <div className="cyber-info-content">
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: 'var(--neon-blue)',
                    textShadow: '0 0 10px currentColor'
                  }}>
                    50%
                  </div>
                </div>
              </div>

              <div className="cyber-info-card">
                <div className="cyber-info-header">📊 BEST MONTH</div>
                <div className="cyber-info-content">
                  {earnings.monthlyData.length > 0 && (
                    <>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--neon-purple)',
                        marginBottom: '4px'
                      }}>
                        {earnings.monthlyData.reduce((best, current) =>
                          current.earnings > best.earnings ? current : best
                        ).month}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--cyber-text-muted)'
                      }}>
                        {formatCurrency(Math.max(...earnings.monthlyData.map(d => d.earnings)))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '24px' }}>📡 COMMISSION TRANSACTIONS</h3>

          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>💎</div>
              <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
                NO EARNINGS DETECTED
              </h3>
              <p style={{ color: 'var(--cyber-text-muted)', marginBottom: '24px' }}>
                Complete your first sale to start earning commissions
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="holo-table">
                <thead>
                  <tr>
                    <th>CLIENT</th>
                    <th>SALE AMOUNT</th>
                    <th>COMMISSION</th>
                    <th>STATUS</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(transaction => (
                    <tr key={transaction._id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                            {transaction.customer?.name || 'UNKNOWN'}
                          </div>
                          {transaction.customer?.company && (
                            <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                              {transaction.customer.company}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{
                          fontWeight: '700',
                          fontSize: '16px',
                          color: 'var(--neon-blue)',
                          textShadow: '0 0 10px currentColor'
                        }}>
                          {formatCurrency(transaction.amount)}
                        </div>
                      </td>
                      <td>
                        <div style={{
                          fontWeight: '700',
                          fontSize: '16px',
                          color: 'var(--neon-green)',
                          textShadow: '0 0 10px currentColor'
                        }}>
                          {formatCurrency(transaction.computed?.sellerShare || 0)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                          50% RATE
                        </div>
                      </td>
                      <td>
                        <span className={`cyber-badge ${
                          transaction.status === 'paid' ? 'success' :
                          transaction.status === 'approved' ? 'info' : 'warning'
                        }`}>
                          {transaction.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ color: 'var(--cyber-text)' }}>
                          {formatDate(transaction.createdAt)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                          {new Date(transaction.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Earnings;
