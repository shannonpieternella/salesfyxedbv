import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const Playbook = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchPlaybook();
  }, []);

  const fetchPlaybook = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/playbook`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSteps(response.data);
      if (response.data.length > 0) {
        setActiveStep(response.data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching playbook:', error);
      setLoading(false);
    }
  };

  const updatePlaybookStep = async (key, updates) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/playbook/${key}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPlaybook();
      setEditMode(false);
    } catch (error) {
      console.error('Error updating playbook:', error);
      alert('Error updating playbook: ' + (error.response?.data?.error || error.message));
    }
  };

  const stepIcons = {
    leadlist: { icon: '📋', color: '#4BACFE' },
    research: { icon: '🔍', color: '#00D4FF' },
    contact: { icon: '📞', color: '#7B61FF' },
    present_finetune: { icon: '🎯', color: '#F471B5' },
    deal: { icon: '💰', color: '#00FFA3' }
  };

  // English content overrides to ensure full-English Playbook display
  const enContent = {
    leadlist: {
      nav: 'Lead List - Quick Qualification',
      title: 'Step 1: Lead List - Quick Qualification',
      guide: `# Lead List Phase\n\n## Goal\nQuickly decide if this company is a good fit. Focus on fit, not perfection.\n\n## What to do\n1. Add company name, contact person and basic details\n2. Note first impression: does it fit our profile?\n3. Set priority (1–5) based on company size, industry fit and urgency signals\n\n## Time investment\nMax 5–10 minutes per lead. When in doubt, move to research.`,
      tips: [
        'Lower the bar: “I’m not selling yet, just qualifying”',
        'Trust your intuition — first impressions are often right',
        'Optimize for volume at this phase, not perfection',
        'Treat every lead as a learning moment, not pressure'
      ],
      checklist: [
        'Entered company and contact details',
        'Priority set (1–5)',
        'Tags added (industry, size, etc.)',
        'First impression noted'
      ],
      phrases: [
        '“This lead matches our profile because…”',
        '“Priority 4/5 due to recent growth signals”',
        '“Likely to save time in customer support”'
      ]
    },
    research: {
      nav: 'Research - Pain Points & Savings',
      title: 'Step 2: Research - Pain Points & Savings',
      guide: `# Research Phase\n\n## Goal\nUnderstand where time and/or money is being lost. Formulate a savings hypothesis.\n\n## What to do\n1. Research the company (website, LinkedIn, reviews)\n2. Identify possible pain points (manual work to automate, lead/revenue leaks, strategic goals)\n3. Record a savings hypothesis (hours/month and €/month)\n\n## Critical question\n“If I call this company, what is THEIR problem that I solve?”`,
      tips: [
        'Think like a consultant, not a seller',
        'Look for jobs-to-be-done — what are they trying to achieve?',
        'Write down concrete examples and numbers where possible',
        'Focus on their pain, not your solution (yet)'
      ],
      checklist: [
        'Website and LinkedIn reviewed',
        'Identified at least 2 pain points',
        'Savings hypothesis captured (time OR money)',
        'Primary goal set (LEADS/REVENUE/EFFICIENCY)'
      ],
      phrases: [
        '“Support spends ~40h/week on repetitive questions”',
        '“Likely missing ~20% leads due to slow follow-up”',
        '“Hypothesis: save 80h/month by automating intake”'
      ]
    },
    contact: {
      nav: 'Contact - First Conversation',
      title: 'Step 3: Contact - First Conversation',
      guide: `# Contact Phase\n\n## Goal\nMake first human contact and gauge interest. Pick one channel and follow through.\n\n## What to do\n1. Choose a method: Cold Call / Email / In-Person\n2. Log every attempt: method, outcome, short note\n3. On connect: validate pain, ask success criteria, don’t pitch yet\n\n## Rule of thumb\n3 attempts without connection → email fallback`,
      tips: [
        'Smile on cold calls — it’s audible',
        'First 10s: who you are, why calling, value for them',
        'Voicemail: be short and specific',
        'Rejection = data. Always ask “Why not?”'
      ],
      checklist: [
        'Chosen contact method',
        'Logged at least one attempt',
        'Script/email prepared around the pain',
        'On connect: pain validated, interest gauged'
      ],
      phrases: [
        '“I saw you do X — are you spending a lot of time on Y?”',
        '“What would make this a successful solution for you?”',
        '“If we can save ~20 hours/week, is that interesting?”'
      ]
    },
    present_finetune: {
      nav: 'Presentation & Fine-tune',
      title: 'Step 4: Presentation & Fine-tune',
      guide: `# Presentation & Fine-tune Phase\n\n## Goal\nShow how your solution solves their specific pain. Align on success criteria.\n\n## What to do\n1. Prepare demo focused on their problem and ROI\n2. Fine-tune: capture adjustments and agree on measurable criteria\n3. Ask for the decision if criteria are met`,
      tips: [
        'Make it concrete: their examples, their numbers',
        'Reduce risk: pilot/trial when possible',
        'Social proof builds trust',
        'Be honest about limitations'
      ],
      checklist: [
        'Tailored demo prepared',
        'ROI calculation ready',
        'Adjustments captured',
        'Success criteria agreed',
        'Next step defined'
      ],
      phrases: [
        '“You mentioned X is a problem — here’s how we solve it”',
        '“40h/week saved at €50/h ≈ €8k/month”',
        '“Top 3 criteria to call this a success?”'
      ]
    },
    deal: {
      nav: 'Deal - Close',
      title: 'Step 5: Deal - Close',
      guide: `# Deal Phase\n\n## Goal\nGet commitment, or a clear no and learn why.\n\n## What to do\n1. Recap pain, solution, ROI and agreed criteria\n2. Ask for the deal or the next concrete step\n3. Log result: WON (value), LOST (reason), PENDING (follow-up + deadline)`,
      tips: [
        'Recap agreed value and criteria before closing',
        'Reduce friction: next step must be crystal clear'
      ],
      checklist: [
        'Decision makers confirmed',
        'Value and ROI restated',
        'Contract/next step sent'
      ],
      phrases: [
        '“Based on the ROI, are we aligned to move forward?”',
        '“I’ll send the agreement right after this call.”'
      ]
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading playbook...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px'
          }}>
            📖 Sales Playbook
          </h1>
          <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
            Step-by-step guide through the sales process
          </p>
        </div>

        <div className="playbook-grid">
          {/* Step Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {steps.map((step) => {
              const config = stepIcons[step.key] || { icon: '📄', color: '#4BACFE' };
              const isActive = activeStep?.key === step.key;

              return (
                <button
                  key={step.key}
                  onClick={() => setActiveStep(step)}
                  className={`card playbook-step ${step.key}`}
                  style={{
                    padding: '16px',
                    background: isActive
                      ? `${config.color}20`
                      : 'var(--cyber-card)',
                    border: isActive
                      ? `2px solid ${config.color}`
                      : '1px solid var(--cyber-border)',
                    color: isActive ? config.color : 'var(--cyber-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '24px' }}>
                      {config.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '2px'
                      }}>
                        {enContent[step.key]?.nav || step.title.split(':')[1]?.trim() || step.title}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        opacity: 0.7
                      }}>
                        Step {steps.indexOf(step) + 1}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step Content */}
          {activeStep && (
            <div className="card">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    fontSize: '48px',
                    width: '72px',
                    height: '72px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${stepIcons[activeStep.key]?.color}20`,
                    borderRadius: '16px',
                    border: `2px solid ${stepIcons[activeStep.key]?.color}`
                  }}>
                    {stepIcons[activeStep.key]?.icon}
                  </div>
                  <div>
                    <h2 style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: stepIcons[activeStep.key]?.color,
                      marginBottom: '4px'
                    }}>
                      {enContent[activeStep.key]?.title || activeStep.title}
                    </h2>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--cyber-text-muted)'
                    }}>
                      Last updated: {new Date(activeStep.lastUpdated).toLocaleDateString('en-US')}
                    </div>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="btn"
                    style={{
                      background: editMode ? 'var(--neon-blue)20' : 'transparent',
                      border: '1px solid var(--neon-blue)'
                    }}
                  >
                    {editMode ? '📝 Save' : '✏️ Edit'}
                  </button>
                )}
              </div>

              {/* Plain Text Guide */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#333'
                }}>
                  📚 Guide
                </h3>
                {editMode ? (
                  <textarea
                    value={activeStep.plainTextGuide}
                    onChange={(e) => {
                      const newSteps = steps.map(s =>
                        s.key === activeStep.key
                          ? { ...s, plainTextGuide: e.target.value }
                          : s
                      );
                      setSteps(newSteps);
                      setActiveStep({ ...activeStep, plainTextGuide: e.target.value });
                    }}
                    onBlur={() => updatePlaybookStep(activeStep.key, { plainTextGuide: activeStep.plainTextGuide })}
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '12px',
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      color: '#333',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                ) : (
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '14px',
                    color: '#333',
                    background: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}>
                    {enContent[activeStep.key]?.guide || activeStep.plainTextGuide}
                  </div>
                )}
              </div>

              {/* Psychology Tips */}
              {(enContent[activeStep.key]?.tips || activeStep.psychologyTips)?.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#333'
                  }}>
                    🧠 Psychology Tips
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(enContent[activeStep.key]?.tips || activeStep.psychologyTips).map((tip, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '12px',
                          background: 'rgba(123, 97, 255, 0.1)',
                          border: '1px solid rgba(123, 97, 255, 0.3)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: '#333'
                        }}
                      >
                        💡 {tip}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Check Items */}
              {(enContent[activeStep.key]?.checklist || activeStep.checkItems)?.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#333'
                  }}>
                    ✓ Checklist
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(enContent[activeStep.key]?.checklist || activeStep.checkItems).map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '12px',
                          background: 'rgba(0, 255, 163, 0.1)',
                          border: '1px solid rgba(0, 255, 163, 0.3)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: '#333',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: '2px solid var(--neon-green)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px'
                        }}>
                          □
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Example Phrases */}
              {(enContent[activeStep.key]?.phrases || activeStep.examplePhrases)?.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#333'
                  }}>
                    💬 Example Phrases
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(enContent[activeStep.key]?.phrases || activeStep.examplePhrases).map((phrase, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '12px',
                          background: 'rgba(75, 172, 254, 0.1)',
                          border: '1px solid rgba(75, 172, 254, 0.3)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: '#333',
                          fontStyle: 'italic'
                        }}
                      >
                        "{phrase}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Playbook;
