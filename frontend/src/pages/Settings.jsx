import { useAuth } from '../hooks/useAuth';
import PasswordChange from '../components/PasswordChange';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px'
          }}>
            ⚙️ Instellingen
          </h1>
          <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
            Beheer je account instellingen
          </p>
        </div>

        <div style={{
          display: 'grid',
          gap: '24px',
          maxWidth: '800px'
        }}>
          {/* Account Info */}
          <div className="card">
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '16px',
              color: 'var(--cyber-text)'
            }}>
              👤 Account Informatie
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--cyber-text-muted)',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Naam
                </div>
                <div style={{
                  fontSize: '16px',
                  color: 'var(--cyber-text)',
                  fontWeight: '600'
                }}>
                  {user?.name}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--cyber-text-muted)',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Email
                </div>
                <div style={{
                  fontSize: '16px',
                  color: 'var(--cyber-text)',
                  fontWeight: '600'
                }}>
                  {user?.email}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--cyber-text-muted)',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Rol
                </div>
                <span style={{
                  padding: '4px 12px',
                  background: user?.role === 'owner' ? 'rgba(244, 113, 181, 0.2)' :
                            user?.role === 'admin' ? 'rgba(123, 97, 255, 0.2)' :
                            'rgba(75, 172, 254, 0.2)',
                  border: `1px solid ${user?.role === 'owner' ? 'var(--neon-pink)' :
                                      user?.role === 'admin' ? 'var(--neon-purple)' :
                                      'var(--neon-blue)'}`,
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: user?.role === 'owner' ? 'var(--neon-pink)' :
                        user?.role === 'admin' ? 'var(--neon-purple)' :
                        'var(--neon-blue)'
                }}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <PasswordChange />
        </div>
      </div>
    </div>
  );
};

export default Settings;
