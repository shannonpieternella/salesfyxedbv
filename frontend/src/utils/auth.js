export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = () => {
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const hasRole = (requiredRoles) => {
  const user = getUser();
  if (!user) return false;

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(user.role);
};

export const logout = () => {
  removeToken();
  removeUser();
  window.location.href = '/login';
};

export const formatCurrency = (amount, currency = 'EUR') => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (date, format = 'short') => {
  const options = {
    short: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    datetime: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  };

  return new Intl.DateTimeFormat('nl-NL', options[format]).format(new Date(date));
};

export const getStatusBadge = (status) => {
  const statusMap = {
    open: 'warning',
    approved: 'info',
    paid: 'success',
    pending: 'warning',
    processing: 'info',
    failed: 'danger',
    sent: 'info',
    overdue: 'danger',
    cancelled: 'danger',
    draft: 'secondary'
  };

  return statusMap[status] || 'secondary';
};

export const getStatusText = (status) => {
  const statusMap = {
    open: 'Open',
    approved: 'Goedgekeurd',
    paid: 'Betaald',
    pending: 'In behandeling',
    processing: 'Wordt verwerkt',
    failed: 'Mislukt',
    sent: 'Verzonden',
    overdue: 'Achterstallig',
    cancelled: 'Geannuleerd',
    draft: 'Concept'
  };

  return statusMap[status] || status;
};

export const getRoleText = (role) => {
  const roleMap = {
    owner: 'Eigenaar',
    leader: 'Teamleider',
    agent: 'Agent'
  };

  return roleMap[role] || role;
};

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};