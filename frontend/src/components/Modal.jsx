const Modal = ({ children, onClose, title }) => {
  return (
    <div className="cyber-modal-overlay" onClick={onClose}>
      <div className="cyber-modal" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: `1px solid var(--cyber-border)`
          }}>
            <h3 className="neon-text" style={{ margin: 0, fontSize: '20px' }}>{title}</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--cyber-text-muted)',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--neon-blue)';
                e.target.style.background = 'rgba(0, 212, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--cyber-text-muted)';
                e.target.style.background = 'none';
              }}
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;