import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usersAPI, salesAPI, earningsAPI } from '../utils/api';
import { formatCurrency, formatDate, getRoleText } from '../utils/auth';
import Modal from '../components/Modal.jsx';

const Hierarchy = () => {
  const { user } = useAuth();
  const [hierarchyData, setHierarchyData] = useState([]);
  const [users, setUsers] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'table'
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    loadHierarchyData();
  }, [timeFilter]);

  const loadHierarchyData = async () => {
    try {
      setLoading(true);

      // Load all users and sales
      const [usersResponse, salesResponse] = await Promise.all([
        usersAPI.getUsers(),
        salesAPI.getSales({
          ...(timeFilter !== 'all' && {
            startDate: getTimeFilterDate(),
            endDate: new Date().toISOString().split('T')[0]
          })
        })
      ]);

      const allUsers = usersResponse.data.users || [];
      const allSales = salesResponse.data.sales || [];

      setUsers(allUsers);
      setSalesData(allSales);

      // Build hierarchy tree
      const hierarchy = buildHierarchyTree(allUsers, allSales);
      setHierarchyData(hierarchy);

    } catch (error) {
      console.error('Error loading hierarchy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeFilter) {
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

  const buildHierarchyTree = (users, sales) => {
    // Calculate sales and earnings for each user
    const userStats = {};

    users.forEach(user => {
      const userSales = sales.filter(sale =>
        sale.sellerId?._id === user._id || sale.sellerId === user._id
      );

      const totalRevenue = userSales.reduce((sum, sale) => sum + sale.amount, 0);
      const totalCommission = userSales.reduce((sum, sale) => sum + (sale.computed?.sellerShare || 0), 0);

      // Calculate override commissions (as leader/sponsor)
      const overrideCommissions = sales.reduce((sum, sale) => {
        let override = 0;
        if (sale.computed?.leaderId === user._id) override += sale.computed.leaderShare || 0;
        if (sale.computed?.sponsorId === user._id) override += sale.computed.sponsorShare || 0;
        return sum + override;
      }, 0);

      userStats[user._id] = {
        ...user,
        directSales: userSales.length,
        totalRevenue,
        totalCommission,
        overrideCommissions,
        totalEarnings: totalCommission + overrideCommissions,
        children: [],
        level: 0
      };
    });

    // Build tree structure
    const rootNodes = [];
    const processedNodes = new Set();

    // Find root nodes (owners first)
    const owners = users.filter(u => u.role === 'owner');
    owners.forEach(owner => {
      const node = userStats[owner._id];
      if (node) {
        buildSubtree(node, userStats, users, 0);
        rootNodes.push(node);
        processedNodes.add(owner._id);
      }
    });

    // Auto-assign orphaned users to the first owner (Fyxed admin)
    if (owners.length > 0) {
      const fyxedOwner = owners[0];
      const orphanedUsers = users.filter(u =>
        !u.sponsorId &&
        u.role !== 'owner' &&
        !processedNodes.has(u._id)
      );

      // Update orphaned users to have Fyxed as sponsor for display purposes
      orphanedUsers.forEach(orphan => {
        orphan.sponsorId = fyxedOwner._id;
      });
    }

    // Handle orphaned nodes (users whose sponsors might not exist)
    users.forEach(user => {
      if (!processedNodes.has(user._id)) {
        const node = userStats[user._id];
        if (node) {
          buildSubtree(node, userStats, users, 0);
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  };

  const buildSubtree = (parentNode, userStats, users, level) => {
    parentNode.level = level;

    // Find direct reports (including auto-assigned orphans for owners)
    let children = users.filter(user => user.sponsorId === parentNode._id);

    // If this is an owner, also include users without sponsors (auto-assign)
    if (parentNode.role === 'owner') {
      const orphanedUsers = users.filter(u =>
        !u.sponsorId &&
        u._id !== parentNode._id &&
        u.role !== 'owner'
      );
      children = [...children, ...orphanedUsers];
    }

    children.forEach(child => {
      const childNode = userStats[child._id];
      if (childNode) {
        buildSubtree(childNode, userStats, users, level + 1);
        parentNode.children.push(childNode);
      }
    });

    // Calculate team totals
    parentNode.teamStats = calculateTeamStats(parentNode);
  };

  const calculateTeamStats = (node) => {
    let teamSales = node.directSales;
    let teamRevenue = node.totalRevenue;
    let teamCommissions = node.totalEarnings;
    let teamMembers = 1;

    const calculateRecursive = (childNode) => {
      teamSales += childNode.directSales;
      teamRevenue += childNode.totalRevenue;
      teamCommissions += childNode.totalEarnings;
      teamMembers += 1;

      childNode.children.forEach(calculateRecursive);
    };

    node.children.forEach(calculateRecursive);

    return {
      totalMembers: teamMembers,
      totalSales: teamSales,
      totalRevenue: teamRevenue,
      totalCommissions: teamCommissions
    };
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

  const renderTreeNode = (node, isLast = false, prefix = '') => {
    const connector = isLast ? '└─' : '├─';
    const childPrefix = prefix + (isLast ? '  ' : '│ ');

    return (
      <div key={node._id} style={{ fontFamily: 'monospace', fontSize: '14px' }}>
        {/* Current Node */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 0',
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'var(--transition-smooth)'
          }}
          onClick={() => { setSelectedNode(node); setShowModal(true); }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(0, 212, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
          }}
        >
          <span style={{ color: 'var(--cyber-text-muted)', width: '40px' }}>
            {prefix + connector}
          </span>

          <span style={{
            fontSize: '16px',
            marginRight: '8px',
            color: getRoleColor(node.role)
          }}>
            {getRoleIcon(node.role)}
          </span>

          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span style={{
                fontWeight: '600',
                color: 'var(--cyber-text)',
                fontSize: '16px'
              }}>
                {node.name}
              </span>

              <span style={{
                color: getRoleColor(node.role),
                fontSize: '11px',
                textTransform: 'uppercase',
                fontWeight: '700'
              }}>
                {getRoleText(node.role)}
              </span>

              <span style={{
                background: 'rgba(0, 255, 163, 0.2)',
                color: 'var(--neon-green)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {formatCurrency(node.totalEarnings)}
              </span>

              <span style={{
                background: 'rgba(0, 212, 255, 0.2)',
                color: 'var(--neon-blue)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {node.directSales} sales
              </span>

              {node.children.length > 0 && (
                <span style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: 'var(--neon-purple)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  Team: {node.teamStats.totalMembers} members
                </span>
              )}
            </div>

            <div style={{
              fontSize: '12px',
              color: 'var(--cyber-text-muted)',
              marginTop: '2px'
            }}>
              {node.email}
              {node.children.length > 0 && (
                <span style={{ marginLeft: '12px' }}>
                  Team Revenue: {formatCurrency(node.teamStats.totalRevenue)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Child Nodes */}
        {node.children.map((child, index) =>
          renderTreeNode(child, index === node.children.length - 1, childPrefix)
        )}
      </div>
    );
  };

  const renderTableView = () => {
    const flattenHierarchy = (nodes, result = []) => {
      nodes.forEach(node => {
        result.push(node);
        if (node.children.length > 0) {
          flattenHierarchy(node.children, result);
        }
      });
      return result;
    };

    const flatData = flattenHierarchy(hierarchyData);

    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="holo-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>ROLE</th>
              <th>LEVEL</th>
              <th>DIRECT SALES</th>
              <th>PERSONAL EARNINGS</th>
              <th>OVERRIDE EARNINGS</th>
              <th>TOTAL EARNINGS</th>
              <th>TEAM SIZE</th>
              <th>TEAM REVENUE</th>
            </tr>
          </thead>
          <tbody>
            {flatData.map(node => (
              <tr
                key={node._id}
                onClick={() => { setSelectedNode(node); setShowModal(true); }}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', color: getRoleColor(node.role) }}>
                      {getRoleIcon(node.role)}
                    </span>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                        {'  '.repeat(node.level)}{node.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                        {node.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{
                    color: getRoleColor(node.role),
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    fontSize: '12px'
                  }}>
                    {getRoleText(node.role)}
                  </span>
                </td>
                <td>
                  <span className="cyber-badge secondary">
                    L{node.level}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
                    {node.directSales}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--neon-green)', fontWeight: '600' }}>
                    {formatCurrency(node.totalCommission)}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--neon-purple)', fontWeight: '600' }}>
                    {formatCurrency(node.overrideCommissions)}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--neon-green)', fontWeight: '700', fontSize: '16px' }}>
                    {formatCurrency(node.totalEarnings)}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                    {node.teamStats.totalMembers}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--neon-blue)', fontWeight: '700' }}>
                    {formatCurrency(node.teamStats.totalRevenue)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (user?.role !== 'owner' && user?.role !== 'leader') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cyber-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cyber-card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
          <h2 style={{ color: 'var(--neon-pink)', marginBottom: '16px' }}>ACCESS DENIED</h2>
          <p style={{ color: 'var(--cyber-text-muted)' }}>Leader or Owner privileges required for hierarchy view</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          BUILDING HIERARCHY TREE...
        </p>
      </div>
    );
  }

  const totalUsers = users.length;
  const totalRevenue = salesData.reduce((sum, sale) => sum + sale.amount, 0);
  const totalSales = salesData.length;

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
            🌳 HIERARCHY MATRIX
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            ORGANIZATIONAL STRUCTURE & PERFORMANCE TREE
          </p>
        </div>

        {/* Controls */}
        <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 className="neon-text" style={{ margin: 0 }}>🔍 VIEW CONTROLS</h3>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className={`cyber-btn ${viewMode === 'tree' ? 'primary' : 'secondary'}`}
                onClick={() => setViewMode('tree')}
              >
                🌳 TREE VIEW
              </button>
              <button
                className={`cyber-btn ${viewMode === 'table' ? 'primary' : 'secondary'}`}
                onClick={() => setViewMode('table')}
              >
                📊 TABLE VIEW
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label className="cyber-label">TIME FILTER</label>
              <select
                className="cyber-input"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="data-grid" style={{ marginBottom: '32px' }}>
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
                TOTAL TEAM MEMBERS
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-blue)' }}>👥</span>
            </div>
            <div className="metric-value">{totalUsers}</div>
            <div className="metric-label">ACROSS ALL LEVELS</div>
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
                TOTAL REVENUE
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-green)' }}>💰</span>
            </div>
            <div className="metric-value">{formatCurrency(totalRevenue)}</div>
            <div className="metric-label">{totalSales} TOTAL SALES</div>
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
                HIERARCHY LEVELS
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-purple)' }}>🏢</span>
            </div>
            <div className="metric-value">
              {hierarchyData.length > 0 ? Math.max(...users.map(u => {
                let level = 0;
                let current = u;
                while (current.sponsorId && level < 10) {
                  current = users.find(user => user._id === current.sponsorId);
                  level++;
                  if (!current) break;
                }
                return level;
              })) + 1 : 0}
            </div>
            <div className="metric-label">ORGANIZATIONAL DEPTH</div>
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
                AVG REVENUE/PERSON
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-pink)' }}>📊</span>
            </div>
            <div className="metric-value">
              {formatCurrency(totalUsers > 0 ? totalRevenue / totalUsers : 0)}
            </div>
            <div className="metric-label">PERFORMANCE METRIC</div>
          </div>
        </div>

        {/* Hierarchy Visualization */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 className="neon-text" style={{ marginBottom: '24px' }}>
            {viewMode === 'tree' ? '🌳 ORGANIZATION TREE' : '📊 HIERARCHY TABLE'}
          </h3>

          {hierarchyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌳</div>
              <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
                NO HIERARCHY DATA
              </h3>
              <p style={{ color: 'var(--cyber-text-muted)' }}>
                Create users and assign sponsors to build the organization tree
              </p>
            </div>
          ) : (
            <div>
              {viewMode === 'tree' ? (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--cyber-border)',
                  borderRadius: '12px',
                  padding: '24px',
                  maxHeight: '800px',
                  overflowY: 'auto'
                }}>
                  {hierarchyData.map((rootNode, index) =>
                    renderTreeNode(rootNode, index === hierarchyData.length - 1)
                  )}
                </div>
              ) : (
                renderTableView()
              )}
            </div>
          )}
        </div>

        {/* Node Details Modal */}
        {showModal && selectedNode && (
          <Modal onClose={() => setShowModal(false)} title={`🔍 ${selectedNode.name.toUpperCase()} ANALYSIS`}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="cyber-info-card">
                <div className="cyber-info-header">
                  {getRoleIcon(selectedNode.role)} PERSONAL PERFORMANCE
                </div>
                <div className="cyber-info-content">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ color: 'var(--cyber-text-muted)', fontSize: '12px' }}>DIRECT SALES</div>
                      <div style={{ color: 'var(--neon-blue)', fontWeight: '700', fontSize: '18px' }}>
                        {selectedNode.directSales}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--cyber-text-muted)', fontSize: '12px' }}>REVENUE GENERATED</div>
                      <div style={{ color: 'var(--neon-green)', fontWeight: '700', fontSize: '18px' }}>
                        {formatCurrency(selectedNode.totalRevenue)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--cyber-text-muted)', fontSize: '12px' }}>PERSONAL COMMISSION</div>
                      <div style={{ color: 'var(--neon-green)', fontWeight: '700', fontSize: '18px' }}>
                        {formatCurrency(selectedNode.totalCommission)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--cyber-text-muted)', fontSize: '12px' }}>OVERRIDE COMMISSION</div>
                      <div style={{ color: 'var(--neon-purple)', fontWeight: '700', fontSize: '18px' }}>
                        {formatCurrency(selectedNode.overrideCommissions)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedNode.children.length > 0 && (
                <div className="cyber-info-card">
                  <div className="cyber-info-header">👥 TEAM PERFORMANCE</div>
                  <div className="cyber-info-content">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <div style={{ color: 'var(--cyber-text-muted)', fontSize: '12px' }}>TEAM MEMBERS</div>
                        <div style={{ color: 'var(--neon-blue)', fontWeight: '700', fontSize: '18px' }}>
                          {selectedNode.teamStats.totalMembers}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--cyber-text-muted)', fontSize: '12px' }}>TEAM SALES</div>
                        <div style={{ color: 'var(--neon-blue)', fontWeight: '700', fontSize: '18px' }}>
                          {selectedNode.teamStats.totalSales}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--cyber-text-muted)', fontSize: '12px' }}>TEAM REVENUE</div>
                        <div style={{ color: 'var(--neon-green)', fontWeight: '700', fontSize: '18px' }}>
                          {formatCurrency(selectedNode.teamStats.totalRevenue)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--cyber-text-muted)', fontSize: '12px' }}>TEAM COMMISSIONS</div>
                        <div style={{ color: 'var(--neon-green)', fontWeight: '700', fontSize: '18px' }}>
                          {formatCurrency(selectedNode.teamStats.totalCommissions)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="cyber-info-card">
                <div className="cyber-info-header">📊 POSITION DETAILS</div>
                <div className="cyber-info-content">
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--cyber-text)' }}>Role:</span>
                      <span style={{ color: getRoleColor(selectedNode.role), fontWeight: '600' }}>
                        {getRoleText(selectedNode.role)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--cyber-text)' }}>Hierarchy Level:</span>
                      <span className="cyber-badge secondary">Level {selectedNode.level}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--cyber-text)' }}>Email:</span>
                      <span style={{ color: 'var(--cyber-text-muted)' }}>{selectedNode.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--cyber-text)' }}>Total Earnings:</span>
                      <span style={{
                        color: 'var(--neon-green)',
                        fontWeight: '700',
                        fontSize: '20px',
                        textShadow: '0 0 10px currentColor'
                      }}>
                        {formatCurrency(selectedNode.totalEarnings)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedNode.children.length > 0 && (
                <div className="cyber-info-card">
                  <div className="cyber-info-header">🌳 DIRECT REPORTS</div>
                  <div className="cyber-info-content">
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {selectedNode.children.map(child => (
                        <div key={child._id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: getRoleColor(child.role) }}>
                              {getRoleIcon(child.role)}
                            </span>
                            <span style={{ color: 'var(--cyber-text)', fontWeight: '600' }}>
                              {child.name}
                            </span>
                          </div>
                          <span style={{ color: 'var(--neon-green)', fontWeight: '600' }}>
                            {formatCurrency(child.totalEarnings)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                className="cyber-btn secondary"
                onClick={() => setShowModal(false)}
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

export default Hierarchy;