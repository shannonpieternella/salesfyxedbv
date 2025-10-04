import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const AdminAgents = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user && user.role === 'owner') {
      fetchAgents();
    }
  }, [user]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents/global-agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.data);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncVapiAgents = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/agents/sync-vapi-assistants', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.data.synced} agents synchronized!`);
        await fetchAgents();
      } else {
        alert('❌ ' + (data.error || 'Sync failed'));
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('❌ Sync error');
    } finally {
      setSyncing(false);
    }
  };

  const toggleAgent = async (agentId) => {
    try {
      const response = await fetch(`/api/admin/agents/global-agents/${agentId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAgents(agents.map(agent =>
          agent._id === agentId
            ? { ...agent, isActive: data.data.isActive }
            : agent
        ));
      } else {
        alert('❌ ' + (data.error || 'Error changing status'));
      }
    } catch (error) {
      console.error('Error toggling agent:', error);
      alert('❌ Error changing status');
    }
  };

  if (user?.role !== 'owner') {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="card text-center">
            <h2>Access Denied</h2>
            <p>You do not have access to this page.</p>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Admin - Agent Management</h1>
          <button
            onClick={syncVapiAgents}
            disabled={syncing}
            className="btn btn-primary"
          >
            {syncing ? '🔄 Synchronizing...' : '🔄 Sync Vapi Agents'}
          </button>
        </div>

        <div className="info-card">
          <h3>ℹ️ Agent Management</h3>
          <p>Sync agents from your Vapi account and make them available to users.</p>
          <ul>
            <li><strong>Active:</strong> Agent is available to all users</li>
            <li><strong>Inactive:</strong> Agent is hidden from users</li>
            <li><strong>Sync:</strong> Fetch new/updated agents from your Vapi account</li>
          </ul>
        </div>

        {agents.length === 0 ? (
          <div className="card text-center">
            <h3>No Agents Found</h3>
            <p>Click "Sync Vapi Agents" to import agents from your Vapi account.</p>
          </div>
        ) : (
          <div className="admin-agents-grid">
            {agents.map(agent => (
              <div key={agent._id} className={`admin-agent-card ${agent.isActive ? 'active' : 'inactive'}`}>
                <div className="agent-header">
                  <h3>{agent.name}</h3>
                  <div className="agent-status">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={agent.isActive}
                        onChange={() => toggleAgent(agent._id)}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className={`status-label ${agent.isActive ? 'active' : 'inactive'}`}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <p className="agent-description">{agent.description}</p>

                <div className="agent-details">
                  <div className="detail-row">
                    <span className="label">Voice:</span>
                    <span className="value">{agent.voice?.voiceId || 'Not set'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Model:</span>
                    <span className="value">{agent.model?.model || 'Not set'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Max Duration:</span>
                    <span className="value">{Math.floor((agent.callSettings?.maxDuration || 300) / 60)} minutes</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Last Sync:</span>
                    <span className="value">
                      {agent.lastSyncAt ? new Date(agent.lastSyncAt).toLocaleString('en-US') : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAgents;
