import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { getRoleText } from '../utils/auth';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '⚡' },
    { path: '/sales', label: 'Sales', icon: '🚀' },
    { path: '/earnings', label: 'Verdiensten', icon: '💎' },
    { path: '/invoices', label: 'Facturen', icon: '📡' },
  ];

  // Add role-specific nav items
  if (user?.role === 'leader' || user?.role === 'owner') {
    navItems.push(
      { path: '/team', label: 'Team', icon: '🌐' },
      { path: '/users', label: 'Users', icon: '👥' },
      { path: '/hierarchy', label: 'Tree', icon: '🌳' }
    );
  }

  if (user?.role === 'owner') {
    navItems.push(
      { path: '/payouts', label: 'Payouts', icon: '💫' },
      { path: '/admin', label: 'Control', icon: '🔮' }
    );
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav style={{
      background: 'linear-gradient(135deg, var(--cyber-card), var(--cyber-surface))',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--cyber-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative'
      }}>
        {/* Logo */}
        <Link
          to="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'var(--cyber-text)',
            zIndex: 101
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            background: 'var(--accent-gradient)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            boxShadow: '0 0 15px rgba(75, 172, 254, 0.4)'
          }}>
            F
          </div>
          <div style={{ display: isMobile ? 'none' : 'block' }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              FYXED
            </div>
            <div style={{
              fontSize: '10px',
              color: 'var(--cyber-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              SALES MATRIX
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div style={{
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive(item.path) ? 'var(--neon-blue)' : 'var(--cyber-text)',
                background: isActive(item.path)
                  ? 'rgba(0, 212, 255, 0.1)'
                  : 'transparent',
                border: isActive(item.path)
                  ? '1px solid rgba(0, 212, 255, 0.3)'
                  : '1px solid transparent',
                transition: 'var(--transition-smooth)',
                fontSize: '13px',
                fontWeight: '600',
                textShadow: isActive(item.path) ? '0 0 8px currentColor' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.target.style.background = 'transparent';
                  e.target.style.borderColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop User Info & Logout */}
        <div style={{
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--cyber-text)'
            }}>
              {user?.name}
            </div>
            <div style={{
              fontSize: '10px',
              color: 'var(--neon-blue)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 0 8px currentColor'
            }}>
              {getRoleText(user?.role)}
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'rgba(244, 113, 181, 0.2)',
              border: '1px solid var(--neon-pink)',
              color: 'var(--neon-pink)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'var(--transition-smooth)',
              boxShadow: '0 0 8px rgba(244, 113, 181, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--neon-pink)';
              e.target.style.color = 'white';
              e.target.style.boxShadow = '0 0 15px rgba(244, 113, 181, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(244, 113, 181, 0.2)';
              e.target.style.color = 'var(--neon-pink)';
              e.target.style.boxShadow = '0 0 8px rgba(244, 113, 181, 0.3)';
            }}
          >
            LOGOUT
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          style={{
            display: isMobile ? 'flex' : 'none',
            flexDirection: 'column',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            zIndex: 101
          }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <div style={{
            width: '24px',
            height: '2px',
            background: 'var(--neon-blue)',
            borderRadius: '2px',
            transition: 'var(--transition-smooth)',
            transform: isMobileMenuOpen ? 'rotate(45deg) translate(6px, 6px)' : 'none'
          }}></div>
          <div style={{
            width: '24px',
            height: '2px',
            background: 'var(--neon-blue)',
            borderRadius: '2px',
            transition: 'var(--transition-smooth)',
            opacity: isMobileMenuOpen ? 0 : 1
          }}></div>
          <div style={{
            width: '24px',
            height: '2px',
            background: 'var(--neon-blue)',
            borderRadius: '2px',
            transition: 'var(--transition-smooth)',
            transform: isMobileMenuOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none'
          }}></div>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(20px)',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '24px',
          padding: '20px'
        }}>
          {/* User Info */}
          <div style={{
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--cyber-text)',
              marginBottom: '8px'
            }}>
              {user?.name}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--neon-blue)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              textShadow: '0 0 10px currentColor'
            }}>
              {getRoleText(user?.role)}
            </div>
          </div>

          {/* Navigation Items */}
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 32px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: isActive(item.path) ? 'var(--neon-blue)' : 'var(--cyber-text)',
                background: isActive(item.path)
                  ? 'rgba(0, 212, 255, 0.1)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: isActive(item.path)
                  ? '1px solid rgba(0, 212, 255, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '18px',
                fontWeight: '600',
                textShadow: isActive(item.path) ? '0 0 10px currentColor' : 'none',
                minWidth: '200px',
                justifyContent: 'center',
                transition: 'var(--transition-smooth)'
              }}
            >
              <span style={{ fontSize: '24px' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Logout Button */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              logout();
            }}
            style={{
              background: 'rgba(244, 113, 181, 0.2)',
              border: '1px solid var(--neon-pink)',
              color: 'var(--neon-pink)',
              padding: '16px 32px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              transition: 'var(--transition-smooth)',
              boxShadow: '0 0 15px rgba(244, 113, 181, 0.3)',
              marginTop: '20px',
              minWidth: '200px'
            }}
          >
            LOGOUT
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;