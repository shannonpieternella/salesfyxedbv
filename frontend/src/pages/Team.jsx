import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { teamsAPI, usersAPI, earningsAPI } from '../utils/api';
import { formatCurrency, formatDate, getRoleText } from '../utils/auth';
import Modal from '../components/Modal.jsx';

const Team = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [teamStats, setTeamStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    memberIds: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsResponse, usersResponse] = await Promise.all([
        teamsAPI.getTeams(),
        usersAPI.getUsers()
      ]);

      setTeams(teamsResponse.data.teams || []);
      setUsers(usersResponse.data.users || []);

      // Load team stats
      for (const team of teamsResponse.data.teams || []) {
        try {
          const stats = await earningsAPI.getTeamEarnings({ leaderId: team.leaderId._id });
          setTeamStats(prev => ({
            ...prev,
            [team._id]: stats.data.teamEarnings
          }));
        } catch (error) {
          console.error(`Error loading stats for team ${team._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();

    try {
      const teamData = {
        ...newTeam,
        leaderId: user._id
      };

      const response = await teamsAPI.createTeam(teamData);
      if (response.data.team) {
        setTeams(prev => [response.data.team, ...prev]);
        setShowModal(false);
        resetForm();
        alert('Team succesvol aangemaakt!');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Fout bij aanmaken team');
    }
  };

  const handleAddMember = async (teamId, userId) => {
    try {
      await teamsAPI.addMember(teamId, userId);
      loadData(); // Refresh data
      alert('Teamlid succesvol toegevoegd!');
    } catch (error) {
      alert(error.response?.data?.error || 'Fout bij toevoegen teamlid');
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    try {
      await teamsAPI.removeMember(teamId, userId);
      loadData(); // Refresh data
      alert('Teamlid succesvol verwijderd!');
    } catch (error) {
      alert(error.response?.data?.error || 'Fout bij verwijderen teamlid');
    }
  };

  const resetForm = () => {
    setNewTeam({
      name: '',
      description: '',
      memberIds: []
    });
  };

  const availableMembers = users.filter(u =>
    u.role === 'agent' &&
    u.active &&
    !teams.some(team => team.memberIds.some(member => member._id === u._id))
  );

  if (loading) {
    return (
      <div className="cyber-loading">
        <div className="cyber-spinner"></div>
        <p style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>
          LOADING TEAM DATA...
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
            🌐 TEAM MATRIX
          </h1>
          <p style={{
            color: 'var(--cyber-text-muted)',
            fontSize: '18px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            ADVANCED TEAM MANAGEMENT SYSTEM
          </p>
        </div>

        {/* Overview Stats */}
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
                TOTAL TEAMS
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-blue)' }}>🌐</span>
            </div>
            <div className="metric-value">{teams.length}</div>
            <div className="metric-label">ACTIVE TEAMS</div>
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
                TOTAL MEMBERS
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-green)' }}>👥</span>
            </div>
            <div className="metric-value">
              {teams.reduce((sum, team) => sum + team.memberIds.length, 0)}
            </div>
            <div className="metric-label">TEAM MEMBERS</div>
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
              AVAILABLE AGENTS
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-purple)' }}>🚀</span>
            </div>
            <div className="metric-value">{availableMembers.length}</div>
            <div className="metric-label">UNASSIGNED</div>
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
                TEAM REVENUE
              </span>
              <span style={{ fontSize: '32px', color: 'var(--neon-pink)' }}>💎</span>
            </div>
            <div className="metric-value">
              {formatCurrency(
                Object.values(teamStats).reduce((sum, stats) => sum + (stats?.teamTotal || 0), 0)
              )}
            </div>
            <div className="metric-label">TOTAL GENERATED</div>
          </div>
        </div>

        {/* Controls */}
        <div className="cyber-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <h3 className="neon-text" style={{ margin: 0 }}>⚡ TEAM CONTROLS</h3>
            {user?.role === 'owner' && (
              <button
                className="cyber-btn"
                onClick={() => setShowModal(true)}
              >
                ➕ CREATE TEAM
              </button>
            )}
          </div>

          {availableMembers.length > 0 && (
            <div style={{
              background: 'rgba(0, 255, 163, 0.1)',
              border: '1px solid var(--neon-green)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '16px'
            }}>
              <h4 style={{ color: 'var(--neon-green)', marginBottom: '12px' }}>
                🚀 Available Agents ({availableMembers.length})
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '12px'
              }}>
                {availableMembers.map(member => (
                  <div key={member._id} style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ fontWeight: '600', color: 'var(--cyber-text)' }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      {member.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <div className="cyber-card" style={{ padding: '48px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--cyber-text)', marginBottom: '16px' }}>
              No Teams Found
            </h3>
            <p style={{ color: 'var(--cyber-text-muted)', marginBottom: '24px' }}>
              Create your first team to start managing your organization
            </p>
            {user?.role === 'owner' && (
              <button
                className="cyber-btn"
                onClick={() => setShowModal(true)}
              >
                ➕ CREATE FIRST TEAM
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px'
          }}>
            {teams.map(team => (
              <div key={team._id} className="cyber-card" style={{ padding: '24px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '20px'
                }}>
                  <div>
                    <h3 className="neon-text" style={{ margin: 0, marginBottom: '8px' }}>
                      {team.name}
                    </h3>
                    <p style={{
                      color: 'var(--cyber-text-muted)',
                      fontSize: '14px',
                      margin: 0
                    }}>
                      {team.description || 'No description'}
                    </p>
                  </div>
                  <div style={{
                    background: 'var(--accent-gradient)',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'white'
                  }}>
                    {team.memberIds.length} MEMBERS
                  </div>
                </div>

                {/* Team Leader */}
                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid var(--neon-purple)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '24px' }}>👑</span>
                    <div>
                      <div style={{
                        fontWeight: '600',
                        color: 'var(--neon-purple)'
                      }}>
                        {team.leaderId.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--cyber-text-muted)'
                      }}>
                        TEAM LEADER • {team.leaderId.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Stats */}
                {teamStats[team._id] && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid var(--neon-blue)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--neon-blue)'
                      }}>
                        {formatCurrency(teamStats[team._id].teamTotal || 0)}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--cyber-text-muted)',
                        textTransform: 'uppercase'
                      }}>
                        TEAM REVENUE
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(0, 255, 163, 0.1)',
                      border: '1px solid var(--neon-green)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--neon-green)'
                      }}>
                        {formatCurrency(teamStats[team._id].overridesTotal || 0)}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--cyber-text-muted)',
                        textTransform: 'uppercase'
                      }}>
                        OVERRIDES
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Members */}
                <div>
                  <h4 style={{
                    color: 'var(--cyber-text)',
                    fontSize: '14px',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    TEAM MEMBERS ({team.memberIds.length})
                  </h4>

                  {team.memberIds.length === 0 ? (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px dashed var(--cyber-border)',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                      color: 'var(--cyber-text-muted)'
                    }}>
                      No members assigned
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {team.memberIds.map(member => (
                        <div key={member._id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--cyber-border)',
                          borderRadius: '8px',
                          padding: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '16px' }}>🤝</span>
                            <div>
                              <div style={{
                                fontWeight: '600',
                                color: 'var(--cyber-text)',
                                fontSize: '14px'
                              }}>
                                {member.name}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: 'var(--cyber-text-muted)'
                              }}>
                                {member.email}
                              </div>
                            </div>
                          </div>
                          {user?.role === 'owner' && (
                            <button
                              onClick={() => handleRemoveMember(team._id, member._id)}
                              style={{
                                background: 'rgba(244, 113, 181, 0.2)',
                                border: '1px solid var(--neon-pink)',
                                color: 'var(--neon-pink)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'var(--neon-pink)';
                                e.target.style.color = 'white';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(244, 113, 181, 0.2)';
                                e.target.style.color = 'var(--neon-pink)';
                              }}
                            >
                              REMOVE
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Member Section */}
                  {user?.role === 'owner' && availableMembers.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMember(team._id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        style={{
                          width: '100%',
                          background: 'var(--cyber-surface)',
                          border: '1px solid var(--cyber-border)',
                          borderRadius: '8px',
                          padding: '12px',
                          color: 'var(--cyber-text)',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">➕ Add Member to Team</option>
                        {availableMembers.map(member => (
                          <option key={member._id} value={member._id}>
                            {member.name} ({member.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Team Modal */}
        {showModal && (
          <Modal onClose={() => { setShowModal(false); resetForm(); }} title="CREATE NEW TEAM">
            <form onSubmit={handleCreateTeam}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--cyber-text)',
                  fontWeight: '600'
                }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  className="cyber-input"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter team name..."
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--cyber-text)',
                  fontWeight: '600'
                }}>
                  Description
                </label>
                <textarea
                  className="cyber-input"
                  rows="3"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the team's purpose..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: '24px'
              }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid var(--cyber-border)',
                    color: 'var(--cyber-text)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  CANCEL
                </button>
                <button type="submit" className="cyber-btn">
                  🚀 CREATE TEAM
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Team;