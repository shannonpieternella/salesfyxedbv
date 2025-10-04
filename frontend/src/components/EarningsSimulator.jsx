import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/auth';

const EarningsSimulator = () => {
  const [scenario, setScenario] = useState({
    clients: 10,
    leadsPerClient: 5,
    pricePerLead: 50,
    retainers: 3,
    retainerValue: 1000,
    customCount: 2,
    customAvg: 5000
  });

  const [results, setResults] = useState({
    breakdown: {
      leadActivation: 0,
      retainers: 0,
      custom: 0
    },
    totalRevenue: 0,
    shares: {
      agent: 0,
      leader: 0,
      sponsor: 0,
      fyxed: 0
    }
  });

  useEffect(() => {
    calculateResults();
  }, [scenario]);

  const calculateResults = () => {
    const leadRevenue = scenario.clients * scenario.leadsPerClient * scenario.pricePerLead;
    const retainerRevenue = scenario.retainers * scenario.retainerValue;
    const customRevenue = scenario.customCount * scenario.customAvg;
    const totalRevenue = leadRevenue + retainerRevenue + customRevenue;

    const agentShare = totalRevenue * 0.5;
    const leaderShare = totalRevenue * 0.1;
    const sponsorShare = totalRevenue * 0.1;
    const fyxedShare = totalRevenue * 0.3;

    setResults({
      breakdown: {
        leadActivation: leadRevenue,
        retainers: retainerRevenue,
        custom: customRevenue
      },
      totalRevenue: totalRevenue,
      shares: {
        agent: agentShare,
        leader: leaderShare,
        sponsor: sponsorShare,
        fyxed: fyxedShare
      }
    });
  };

  const handleInputChange = (field, value) => {
    setScenario(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  const presets = [
    { name: 'Starter', clients: 5, leadsPerClient: 3, retainers: 1, customCount: 1 },
    { name: 'Groeier', clients: 10, leadsPerClient: 5, retainers: 3, customCount: 2 },
    { name: 'Pro', clients: 20, leadsPerClient: 8, retainers: 5, customCount: 4 },
    { name: 'Champion', clients: 50, leadsPerClient: 10, retainers: 10, customCount: 8 }
  ];

  const applyPreset = (preset) => {
    setScenario(prev => ({
      ...prev,
      clients: preset.clients,
      leadsPerClient: preset.leadsPerClient,
      retainers: preset.retainers,
      customCount: preset.customCount
    }));
  };

  return (
    <div className="simulator-card">
      <div className="simulator-header">
        <h2 className="simulator-title">💰 Verdiensten Simulator</h2>
        <p className="simulator-subtitle">
          Zie hoeveel je kunt verdienen met verschillende scenario's
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '16px', color: '#374151' }}>🚀 Quick Presets</h4>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {presets.map(preset => (
            <button
              key={preset.name}
              className="btn btn-secondary"
              onClick={() => applyPreset(preset)}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="simulator-content">
        <div className="simulator-inputs">
          <div className="input-group">
            <label>🎯 Number of Customers: {scenario.clients}</label>
            <input
              type="range"
              className="range-input"
              min="1"
              max="100"
              value={scenario.clients}
              onChange={(e) => handleInputChange('clients', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>📈 Leads per Klant per Maand: {scenario.leadsPerClient}</label>
            <input
              type="range"
              className="range-input"
              min="1"
              max="20"
              value={scenario.leadsPerClient}
              onChange={(e) => handleInputChange('leadsPerClient', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>💶 Prijs per Lead: {formatCurrency(scenario.pricePerLead)}</label>
            <input
              type="range"
              className="range-input"
              min="25"
              max="200"
              step="25"
              value={scenario.pricePerLead}
              onChange={(e) => handleInputChange('pricePerLead', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>🔄 Number of Retainers: {scenario.retainers}</label>
            <input
              type="range"
              className="range-input"
              min="0"
              max="20"
              value={scenario.retainers}
              onChange={(e) => handleInputChange('retainers', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>💼 Retainer Waarde: {formatCurrency(scenario.retainerValue)}</label>
            <input
              type="range"
              className="range-input"
              min="500"
              max="5000"
              step="250"
              value={scenario.retainerValue}
              onChange={(e) => handleInputChange('retainerValue', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>⚡ Custom Projecten: {scenario.customCount}</label>
            <input
              type="range"
              className="range-input"
              min="0"
              max="10"
              value={scenario.customCount}
              onChange={(e) => handleInputChange('customCount', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>🎯 Gemiddelde Custom Waarde: {formatCurrency(scenario.customAvg)}</label>
            <input
              type="range"
              className="range-input"
              min="1000"
              max="20000"
              step="1000"
              value={scenario.customAvg}
              onChange={(e) => handleInputChange('customAvg', e.target.value)}
            />
          </div>
        </div>

        <div className="simulator-results">
          <h4 style={{ marginBottom: '20px', color: '#374151' }}>📊 Monthly Results</h4>

          <div className="result-item">
            <span className="result-label">🎯 Lead Activatie</span>
            <span className="result-value" style={{ color: '#667eea' }}>
              {formatCurrency(results.breakdown.leadActivation)}
            </span>
          </div>

          <div className="result-item">
            <span className="result-label">🔄 Retainers</span>
            <span className="result-value" style={{ color: '#667eea' }}>
              {formatCurrency(results.breakdown.retainers)}
            </span>
          </div>

          <div className="result-item">
            <span className="result-label">⚡ Custom Projecten</span>
            <span className="result-value" style={{ color: '#667eea' }}>
              {formatCurrency(results.breakdown.custom)}
            </span>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '2px solid #e2e8f0' }}>
            <h5 style={{ marginBottom: '16px', color: '#374151' }}>💸 Commissie Verdeling</h5>

            <div className="result-item">
              <span className="result-label">🤝 Jouw Aandeel (50%)</span>
              <span className="result-value" style={{ color: '#38a169', fontWeight: '700' }}>
                {formatCurrency(results.shares.agent)}
              </span>
            </div>

            <div className="result-item">
              <span className="result-label">👨‍💼 Teamleider (10%)</span>
              <span className="result-value" style={{ color: '#667eea' }}>
                {formatCurrency(results.shares.leader)}
              </span>
            </div>

            <div className="result-item">
              <span className="result-label">👑 Sponsor (10%)</span>
              <span className="result-value" style={{ color: '#667eea' }}>
                {formatCurrency(results.shares.sponsor)}
              </span>
            </div>

            <div className="result-item">
              <span className="result-label">🏢 Fyxed (30%)</span>
              <span className="result-value" style={{ color: '#718096' }}>
                {formatCurrency(results.shares.fyxed)}
              </span>
            </div>
          </div>

          <div className="result-total">
            <div className="result-total-label">💰 Total Revenue per Month</div>
            <div className="result-total-value">{formatCurrency(results.totalRevenue)}</div>
            <div style={{ fontSize: '16px', marginTop: '8px', opacity: 0.9 }}>
              Per year: {formatCurrency(results.totalRevenue * 12)}
            </div>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'rgba(56, 161, 105, 0.1)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#38a169', fontWeight: '600', fontSize: '14px' }}>
              🎯 Your monthly earnings
            </div>
            <div style={{
              color: '#38a169',
              fontWeight: '700',
              fontSize: '24px',
              marginTop: '4px'
            }}>
              {formatCurrency(results.shares.agent)}
            </div>
            <div style={{ color: '#38a169', fontSize: '12px', marginTop: '4px' }}>
              ({formatCurrency(results.shares.agent * 12)} per year)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsSimulator;
