import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { earningsAPI, salesAPI, adminAPI } from '../utils/api';
import { formatCurrency, formatDate, getRoleText } from '../utils/auth';
import EarningsSimulator from './EarningsSimulator';
import '../styles/dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayEarnings: 0,
    monthEarnings: 0,
    totalSales: 0,
    salesCount: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load earnings summary
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const [monthlyEarnings, todayEarnings, salesResponse] = await Promise.all([
        earningsAPI.getSummary({
          startDate: startOfMonth.toISOString(),
          endDate: today.toISOString()
        }),
        earningsAPI.getSummary({
          startDate: startOfToday.toISOString(),
          endDate: today.toISOString()
        }),
        salesAPI.getSales({ limit: 5 })
      ]);

      setStats({
        todayEarnings: todayEarnings.data.earnings.total || 0,
        monthEarnings: monthlyEarnings.data.earnings.total || 0,
        totalSales: monthlyEarnings.data.earnings.ownSales || 0,
        salesCount: salesResponse.data.summary.count || 0
      });

      setRecentSales(salesResponse.data.sales || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMotivationalMessage = () => {
    const hour = new Date().getHours();
    const messages = {
      morning: [
        `Goedemorgen ${user.name}! 🌅 Start je dag met nieuwe kansen!`,
        `Een nieuwe dag, nieuwe mogelijkheden! ☀️ Wat ga je vandaag bereiken?`,
        `Tijd om te shinen! ✨ Jouw potentieel is onbeperkt!`
      ],
      afternoon: [
        `Goedemiddag ${user.name}! 🚀 Hoe staat je dag ervoor?`,
        `Je bent al halverwege! 💪 Blijf doorgaan!`,
        `De middag energie is perfect voor nieuwe deals! ⚡`
      ],
      evening: [
        `Goedenavond ${user.name}! 🌆 Reflecteer op je successen van vandaag!`,
        `Een productieve dag achter de rug? 📈 Morgen wordt nog beter!`,
        `Avond is de tijd voor planning! 🎯 Wat zijn je doelen voor morgen?`
      ]
    };

    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    if (hour >= 18) timeOfDay = 'evening';

    const timeMessages = messages[timeOfDay];
    return timeMessages[Math.floor(Math.random() * timeMessages.length)];
  };

  const getAchievements = () => {
    const achievements = [
      {
        icon: '🎯',
        value: formatCurrency(stats.monthEarnings),
        label: 'Deze Maand'
      },
      {
        icon: '📈',
        value: stats.salesCount,
        label: 'Sales'
      },
      {
        icon: '🏆',
        value: user.role === 'agent' ? '50%' : user.role === 'leader' ? '60%' : '100%',
        label: 'Commissie'
      },
      {
        icon: '⭐',
        value: Math.floor(stats.monthEarnings / 100) || 0,
        label: 'Punten'
      }
    ];

    return achievements;
  };

  const quickActions = [
    {
      icon: '💰',
      title: 'New Sale',
      href: '/sales/new',
      description: 'Registreer een nieuwe sale'
    },
    {
      icon: '📊',
      title: 'Mijn Verdiensten',
      href: '/earnings',
      description: 'Bekijk je verdiensten'
    },
    {
      icon: '👥',
      title: 'Mijn Team',
      href: '/team',
      description: 'Beheer je team'
    },
    {
      icon: '🧾',
      title: 'Facturen',
      href: '/invoices',
      description: 'Beheer facturen'
    }
  ];

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welkom terug, {user.name} ({getRoleText(user.role)})
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Vandaag Verdiend</span>
            <span className="stat-icon">💸</span>
          </div>
          <div className="stat-value">{formatCurrency(stats.todayEarnings)}</div>
          <div className="stat-change positive">
            🔥 Keep going!
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Deze Maand</span>
            <span className="stat-icon">📈</span>
          </div>
          <div className="stat-value">{formatCurrency(stats.monthEarnings)}</div>
          <div className="stat-change positive">
            +{Math.round((stats.monthEarnings / 1000) * 10) / 10}K this month
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Totale Sales</span>
            <span className="stat-icon">🎯</span>
          </div>
          <div className="stat-value">{stats.salesCount}</div>
          <div className="stat-change positive">
            📊 Geweldig bezig!
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Commissie Rate</span>
            <span className="stat-icon">⚡</span>
          </div>
          <div className="stat-value">
            {user.role === 'agent' ? '50%' : user.role === 'leader' ? '60%' : '100%'}
          </div>
          <div className="stat-change positive">
            💪 Maximize je potentieel
          </div>
        </div>
      </div>

      {/* Motivational Section */}
      <div className="motivational-section">
        <div className="motivational-content">
          <h2 className="motivational-title">
            {getMotivationalMessage()}
          </h2>
          <p className="motivational-text">
            {user.role === 'agent' && "Elke sale brengt je 50% commission. Jouw hard werk wordt beloond!"}
            {user.role === 'leader' && "Als teamleider verdien je 50% van eigen sales + 10% van je team. Leid je team naar succes!"}
            {user.role === 'owner' && "Beheer het hele platform en maximaliseer de groei van Fyxed BV!"}
          </p>

          <div className="achievement-grid">
            {getAchievements().map((achievement, index) => (
              <div key={index} className="achievement-item">
                <span className="achievement-icon">{achievement.icon}</span>
                <div className="achievement-value">{achievement.value}</div>
                <div className="achievement-label">{achievement.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings Simulator */}
      <EarningsSimulator />

      {/* Recent Sales */}
      {recentSales.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '20px', color: '#374151' }}>🔥 Recente Sales</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Klant</th>
                  <th>Bedrag</th>
                  <th>Commissie</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map(sale => (
                  <tr key={sale._id}>
                    <td>
                      <strong>{sale.customer?.name || 'Unknown'}</strong>
                      {sale.customer?.company && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {sale.customer.company}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{formatCurrency(sale.amount)}</strong>
                    </td>
                    <td>
                      <span style={{ color: '#38a169', fontWeight: '600' }}>
                        {formatCurrency(sale.computed?.sellerShare || 0)}
                      </span>
                    </td>
                    <td>{formatDate(sale.createdAt)}</td>
                    <td>
                      <span className={`badge badge-${sale.status === 'paid' ? 'success' : sale.status === 'approved' ? 'info' : 'warning'}`}>
                        {sale.status === 'paid' ? 'Betaald' : sale.status === 'approved' ? 'Goedgekeurd' : 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        {quickActions.map((action, index) => (
          <a key={index} href={action.href} className="action-btn">
            <span className="action-icon">{action.icon}</span>
            <span className="action-title">{action.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
