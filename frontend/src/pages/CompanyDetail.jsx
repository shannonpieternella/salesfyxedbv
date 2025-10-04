import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState('');

  useEffect(() => {
    fetchCompany();
  }, [id]);

  useEffect(() => {
    if (company) {
      setActiveStep(company.currentPhase);
    }
  }, [company]);

  const fetchCompany = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompany(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching company:', error);
      alert('Error fetching company');
      navigate('/companies');
    }
  };

  const updateStep = async (stepKey, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${id}/steps/${stepKey}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompany(response.data);
    } catch (error) {
      console.error('Error updating step:', error);
      alert('Error updating step: ' + (error.response?.data?.error || error.message));
    }
  };

  const addContactAttempt = async (method, outcome, notes) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${id}/contact/attempts`,
        { method, outcome, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompany(response.data);
    } catch (error) {
      console.error('Error adding contact attempt:', error);
      alert('Error adding contact attempt');
    }
  };

  const updateDeal = async (result, valueEUR, notes) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${id}/deal`,
        { result, valueEUR, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompany(response.data);
    } catch (error) {
      console.error('Error updating deal:', error);
      alert('Error updating deal');
    }
  };

  const toggleChecklistItem = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${id}/checklist/${itemId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompany(response.data);
    } catch (error) {
      console.error('Error toggling checklist:', error);
    }
  };

  const addChecklistItem = async (label, stepKey) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${id}/checklist`,
        { label, stepKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompany(response.data);
    } catch (error) {
      console.error('Error adding checklist item:', error);
    }
  };

  const steps = [
    { key: 'leadlist', label: 'Lead List', icon: '📋', color: '#4BACFE' },
    { key: 'research', label: 'Research', icon: '🔍', color: '#00D4FF' },
    { key: 'contact', label: 'Contact', icon: '📞', color: '#7B61FF' },
    { key: 'present_finetune', label: 'Presentation', icon: '🎯', color: '#F471B5' },
    { key: 'deal', label: 'Deal', icon: '💰', color: '#00FFA3' }
  ];

  const statusOptions = [
    { value: 'NOT_STARTED', label: 'Not Started', color: '#666' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: '#FFC107' },
    { value: 'DONE', label: 'Done', color: '#00FFA3' },
    { value: 'SKIPPED', label: 'Skipped', color: '#999' }
  ];

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading company...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = company.stepState[activeStep];
  const stepConfig = steps.find(s => s.key === activeStep);

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Link to="/companies" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--cyber-text-muted)',
            textDecoration: 'none',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            ← Back to companies
          </Link>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: 'var(--cyber-text)',
            marginBottom: '8px'
          }}>
            {company.name}
          </h1>
          <div style={{
            display: 'flex',
            gap: '16px',
            fontSize: '14px',
            color: 'var(--cyber-text-muted)'
          }}>
            {company.contactPerson && <span>👤 {company.contactPerson}</span>}
            {company.email && <span>✉️ {company.email}</span>}
            {company.phone && <span>📞 {company.phone}</span>}
          </div>
        </div>

        {/* Step Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {steps.map((step, index) => {
            const stepData = company.stepState[step.key];
            const isActive = activeStep === step.key;
            const isCurrent = company.currentPhase === step.key;

            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                style={{
                  flex: '1',
                  minWidth: '140px',
                  padding: '16px',
                  background: isActive
                    ? `${step.color}20`
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isActive
                    ? `2px solid ${step.color}`
                    : '1px solid var(--cyber-border)',
                  borderRadius: '12px',
                  color: isActive ? step.color : 'var(--cyber-text)',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  position: 'relative'
                }}
              >
                {isCurrent && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    background: step.color,
                    borderRadius: '50%',
                    boxShadow: `0 0 10px ${step.color}`
                  }} />
                )}
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>
                  {step.label}
                </div>
                <div style={{
                  fontSize: '10px',
                  marginTop: '4px',
                  opacity: 0.7
                }}>
                  {stepData?.status === 'DONE' ? '✓ Done' :
                   stepData?.status === 'IN_PROGRESS' ? '⏳ In Progress' :
                   stepData?.status === 'SKIPPED' ? '⤵️ Skip' : '○'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="detail-grid">
          {/* Main Step Content */}
          <div className="card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '36px',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${stepConfig?.color}20`,
                borderRadius: '12px',
                border: `2px solid ${stepConfig?.color}`
              }}>
                {stepConfig?.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: stepConfig?.color
                }}>
                  {stepConfig?.label}
                </h2>
              </div>
              <select
                value={currentStep?.status || 'NOT_STARTED'}
                onChange={(e) => {
                  const newCompany = { ...company };
                  newCompany.stepState[activeStep].status = e.target.value;
                  setCompany(newCompany);
                  updateStep(activeStep, { status: e.target.value });
                }}
                style={{
                  padding: '8px 12px',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  color: '#333',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--cyber-text-muted)',
                marginBottom: '8px',
                textTransform: 'uppercase'
              }}>
                Notes
              </label>
              <textarea
                value={currentStep?.notes || ''}
                onChange={(e) => {
                  const newCompany = { ...company };
                  newCompany.stepState[activeStep].notes = e.target.value;
                  setCompany(newCompany);
                }}
                onBlur={() => updateStep(activeStep, { notes: currentStep?.notes })}
                placeholder="Notes for this step..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--cyber-border)',
                  borderRadius: '8px',
                  color: 'var(--cyber-text)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Step-specific fields */}
            {activeStep === 'research' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Pijnpunten & Findings
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {currentStep?.painPoints?.map((point, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      background: 'rgba(244, 67, 54, 0.1)',
                      border: '1px solid rgba(244, 67, 54, 0.3)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      ⚠️ {point}
                    </div>
                  ))}
                  {currentStep?.findings?.map((finding, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      background: 'rgba(33, 150, 243, 0.1)',
                      border: '1px solid rgba(33, 150, 243, 0.3)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      💡 {finding}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStep === 'contact' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Contact Attempts
                </h3>
                <div style={{ marginBottom: '16px' }}>
                  <select
                    value={currentStep?.method || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const newCompany = { ...company };
                      newCompany.stepState.contact.method = value;
                      setCompany(newCompany);
                      updateStep('contact', { method: value });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      color: '#333',
                      fontSize: '14px',
                      marginBottom: '12px'
                    }}
                  >
                    <option value="">Select method</option>
                    <option value="COLD_CALL">📞 Cold Call</option>
                    <option value="EMAIL">✉️ Email</option>
                    <option value="IN_PERSON">🤝 In-Person</option>
                  </select>
                </div>

                {currentStep?.attempts?.map((attempt, i) => (
                  <div key={i} style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--cyber-border)',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px' }}>
                        {attempt.method === 'COLD_CALL' ? '📞' :
                         attempt.method === 'EMAIL' ? '✉️' : '🤝'} {attempt.method}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: attempt.outcome === 'CONNECTED' ? '#00FFA3' :
                               attempt.outcome === 'REJECTED' ? '#F44336' : '#FFC107'
                      }}>
                        {attempt.outcome}
                      </span>
                    </div>
                    {attempt.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                        {attempt.notes}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => {
                    const method = prompt('Method (COLD_CALL/EMAIL/IN_PERSON):');
                    const outcome = prompt('Outcome (CONNECTED/NO_ANSWER/REJECTED):');
                    const notes = prompt('Notes (optional):');
                    if (method && outcome) {
                      addContactAttempt(method, outcome, notes || '');
                    }
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  + Add Attempt
                </button>
              </div>
            )}

            {activeStep === 'present_finetune' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Adjustments & Success Criteria
                </h3>
                {currentStep?.adjustments?.map((adj, i) => (
                  <div key={i} style={{
                    padding: '8px 12px',
                    background: 'rgba(123, 97, 255, 0.1)',
                    border: '1px solid rgba(123, 97, 255, 0.3)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '8px'
                  }}>
                    🔧 {adj}
                  </div>
                ))}
                {currentStep?.agreedSuccessCriteria?.map((criteria, i) => (
                  <div key={i} style={{
                    padding: '8px 12px',
                    background: 'rgba(0, 255, 163, 0.1)',
                    border: '1px solid rgba(0, 255, 163, 0.3)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '8px'
                  }}>
                    ✓ {criteria}
                  </div>
                ))}
              </div>
            )}

            {activeStep === 'deal' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Deal Result
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <select
                    value={currentStep?.result || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const newCompany = { ...company };
                      newCompany.stepState.deal.result = value;
                      setCompany(newCompany);
                      updateDeal(value, currentStep?.valueEUR, currentStep?.notes);
                    }}
                    style={{
                      padding: '10px 12px',
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      color: '#333',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select result</option>
                    <option value="WON">✓ WON</option>
                    <option value="LOST">✗ LOST</option>
                    <option value="PENDING">⏳ PENDING</option>
                  </select>

                  {currentStep?.result === 'WON' && (
                    <div>
                      <label className="form-label">Dealwaarde (EUR)</label>
                      <input
                        type="number"
                        value={currentStep?.valueEUR || ''}
                        onChange={(e) => {
                          const newCompany = { ...company };
                          newCompany.stepState.deal.valueEUR = parseFloat(e.target.value);
                          setCompany(newCompany);
                        }}
                        onBlur={() => updateDeal(currentStep?.result, currentStep?.valueEUR, currentStep?.notes)}
                        placeholder="5000"
                        className="form-input"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Checklist (per step) */}
            <div className="card">
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: 'var(--cyber-text)'
              }}>
                ✓ Checklist
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(company.checklist || []).filter(item => !item.stepKey || item.stepKey === activeStep).map((item) => (
                  <div
                    key={item._id}
                    onClick={() => toggleChecklistItem(item._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: '2px solid var(--neon-blue)',
                      background: item.checked ? 'var(--neon-blue)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      {item.checked && '✓'}
                    </div>
                    <span style={{
                      fontSize: '13px',
                      textDecoration: item.checked ? 'line-through' : 'none',
                      opacity: item.checked ? 0.6 : 1
                    }}>
                      {item.label}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const label = prompt('New checklist item:');
                    if (label) addChecklistItem(label, activeStep);
                  }}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: '1px dashed var(--cyber-border)',
                    borderRadius: '6px',
                    color: 'var(--cyber-text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Savings */}
            {company.savingsHypothesis && (company.savingsHypothesis.timeHoursPerMonth || company.savingsHypothesis.costPerMonth) && (
              <div className="card">
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: 'var(--cyber-text)'
                }}>
                  💰 Savings Hypothesis
                </h3>
                {company.savingsHypothesis.timeHoursPerMonth && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--neon-blue)' }}>
                      {company.savingsHypothesis.timeHoursPerMonth}h
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      per month
                    </div>
                  </div>
                )}
                {company.savingsHypothesis.costPerMonth && (
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--neon-green)' }}>
                      €{company.savingsHypothesis.costPerMonth}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                      per month
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;
