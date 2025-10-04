import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const VoiceAgents = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [credits, setCredits] = useState({ balance: null, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [calling, setCalling] = useState(false);
  const [recentCalls, setRecentCalls] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchAgents(),
        fetchCredits(),
        fetchRecentCalls()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/voice-agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.data);
        if (data.data.length > 0) {
          setSelectedAgent(data.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCredits(data.data);
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const fetchRecentCalls = async () => {
    try {
      const response = await fetch('/api/voice-calls?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setRecentCalls(data.data.calls || []);
      }
    } catch (error) {
      console.error('Error loading recent calls:', error);
    }
  };

  const handleCall = async (e) => {
    e.preventDefault();

    if (!selectedAgent) {
      alert('Please select an agent first');
      return;
    }

    if (!phoneNumber.trim()) {
      alert('Voer een telefoonnummer in');
      return;
    }

    // Users can go into negative balance, but warn if very low
    if (credits.balance !== null && credits.balance < -10) {
      const confirmed = confirm('Je budget is erg laag (€-10,00). Wil je toch bellen? Het gesprek zal je saldo verder in de min brengen.');
      if (!confirmed) return;
    }

    setCalling(true);

    try {
      const response = await fetch('/api/voice-calls/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          agentId: selectedAgent,
          phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+31${phoneNumber.replace(/^0/, '')}`
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Gesprek wordt gestart!');
        setPhoneNumber('');
        await fetchCredits();
        await fetchRecentCalls();
      } else {
        alert('❌ ' + (data.error || 'Error starting call'));
      }
    } catch (error) {
      console.error('Error starting call:', error);
      alert('❌ Error starting call');
    } finally {
      setCalling(false);
    }
  };

  const handleTopUp = (credits) => {
    fetch('/api/credits/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ credits })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        window.location.href = data.data.url;
      } else {
        alert(data.error || 'Payment error');
      }
    })
    .catch(error => {
      console.error('Payment error:', error);
      alert('Payment error');
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

  if (agents.length === 0) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="card text-center">
            <h2>No AI Agents Available</h2>
            <p>No voice agents are available at the moment. Please contact the administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>AI Voice Calls</h1>
          <div className="credits-display">
            <span className="credits-label">Budget:</span>
            <span className="credits-amount">
              {credits.balance !== null ? `€${credits.balance.toFixed(2)}` : 'Loading...'}
            </span>
          </div>
        </div>

        {/* Demo budget info */}
        {credits.balance !== null && credits.balance > 0 && credits.balance <= 5 && credits.totalPurchased === 0 && (
          <div className="info-card">
            <h3>🎁 Welcome! You have €{credits.balance.toFixed(2)} free demo credit</h3>
            <p>Select an AI agent, enter a phone number, and start your first call!</p>
          </div>
        )}

        {/* Low/negative budget warning */}
        {credits.balance !== null && credits.balance < 1 && (
          <div className={credits.balance < 0 ? "error-card" : "warning-card"}>
            <h3>{credits.balance < 0 ? "💳 Negative balance" : "⚠️ Low balance"}</h3>
            <p>
              {credits.balance < 0
                ? `Your balance is -€${Math.abs(credits.balance).toFixed(2)}. Top up to get positive again:`
                : `You have €${credits.balance.toFixed(2)} remaining. Add funds to keep calling:`
              }
            </p>
            <div className="credit-options">
              <button onClick={() => handleTopUp(10)} className="btn btn-sm btn-primary">Add €10</button>
              <button onClick={() => handleTopUp(25)} className="btn btn-sm btn-primary">Add €25</button>
              <button onClick={() => handleTopUp(50)} className="btn btn-sm btn-primary">Add €50</button>
            </div>
          </div>
        )}

        {/* Main calling interface */}
        <div className="calling-interface">
          <form onSubmit={handleCall} className="call-form-main">
            <div className="form-row">
              <div className="form-group">
                <label>Choose AI Agent:</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  required
                >
                  {agents.map(agent => (
                    <option key={agent._id} value={agent._id}>
                      {agent.name} - {agent.voice?.voiceId || 'AI Voice'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Phone number:</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 06 12345678 or +31612345678"
                  required
                />
              </div>

              <div className="form-group">
                <button
                  type="submit"
                  className="btn btn-success btn-large"
                  disabled={calling || credits.balance === null}
                >
                  {calling ? '📞 Calling...' :
                   credits.balance === null ? 'Loading...' :
                   credits.balance < 0 ? '📞 Start Call (negative balance)' :
                   '📞 Start Call'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Agent info */}
        {selectedAgent && (
          <div className="agent-info">
            {(() => {
              const agent = agents.find(a => a._id === selectedAgent);
              return agent ? (
                <div className="selected-agent-card">
                  <h3>📱 {agent.name}</h3>
                  {agent.description && <p>{agent.description}</p>}
                  <div className="agent-specs">
                    <span className="spec">🗣️ Voice: {agent.voice?.voiceId}</span>
                    <span className="spec">🤖 Model: {agent.model?.model}</span>
                    <span className="spec">💰 Cost: €0.50/min</span>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Instructions */}
        <div className="instructions-card">
          <h3>💡 How it works</h3>
          <ol>
            <li>Choose an AI agent from the list</li>
            <li>Enter the phone number you want to call</li>
            <li>Click "Start Call"</li>
            <li>The AI agent will automatically call the number</li>
            <li>Cost: €0.50 per minute of calling</li>
          </ol>
        </div>

        {/* Recent Calls */}
        {recentCalls.length > 0 && (
          <div className="recent-calls-section">
            <div className="section-header">
              <h3>📋 Recent Calls</h3>
              <a href="/analytics" className="view-all-link">View all analytics →</a>
            </div>
            <div className="recent-calls-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Number</th>
                    <th>Duration & Cost</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.map((call) => (
                    <tr key={call._id}>
                      <td>{call.agent?.name || 'Unknown'}</td>
                      <td>{call.phoneNumber}</td>
                      <td>
                        {call.duration > 0
                          ? (
                            <div>
                              <span className="duration-badge">{Math.ceil(call.duration / 60)}m</span>
                              <span className="cost-badge">€{(Math.ceil(call.duration / 60) * 0.5).toFixed(2)}</span>
                            </div>
                          )
                          : <span className="status-pending">-</span>
                        }
                      </td>
                      <td>
                        <span className={`status-badge status-${call.status}`}>
                          {call.status === 'ended' ? '✅ Completed' :
                           call.status === 'in-progress' ? '📞 In Progress' :
                           call.status === 'failed' ? '❌ Failed' :
                           '⏳ Pending'}
                        </span>
                      </td>
                      <td>{new Date(call.createdAt).toLocaleString('en-US', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAgents;
