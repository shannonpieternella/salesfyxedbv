require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());

app.set('trust proxy', true);

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://sales.fyxedbv.nl']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
};
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Te veel verzoeken, probeer het later opnieuw' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Te veel login pogingen, probeer het later opnieuw' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Verbonden met MongoDB');

  // Start call updater to check for completed calls
  if (process.env.NODE_ENV !== 'test') {
    callUpdater.start();
  }
})
.catch((error) => {
  console.error('❌ MongoDB verbinding fout:', error);
  process.exit(1);
});

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const salesRoutes = require('./routes/sales');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payments');
const earningsRoutes = require('./routes/earnings');
const teamRoutes = require('./routes/teams');
const payoutRoutes = require('./routes/payouts');
const adminRoutes = require('./routes/admin');
const voiceAgentRoutes = require('./routes/voiceAgents');
const voiceCallRoutes = require('./routes/voiceCalls');
const creditRoutes = require('./routes/credits');
const adminAgentRoutes = require('./routes/adminAgents');
const analyticsRoutes = require('./routes/analytics');
const companyRoutes = require('./routes/companies');
const playbookRoutes = require('./routes/playbook');
const analyticsStepsRoutes = require('./routes/analyticsSteps');
const callUpdater = require('./utils/callUpdater');

// Rate limiting disabled for development
// app.use('/api/auth', strictLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voice-agents', voiceAgentRoutes);
app.use('/api/voice-calls', voiceCallRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/admin/agents', adminAgentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/playbook', playbookRoutes);
app.use('/api/analytics-steps', analyticsStepsRoutes);

// Serve training materials
const path = require('path');
app.use('/training', express.static(path.join(__dirname, 'frontend/public/training')));

// Serve built frontend files
app.use(express.static(path.join(__dirname, 'frontend/dist')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Fyxed BV Sales Platform API',
    version: '1.0.0',
    documentation: 'https://github.com/fyxedbv/sales-platform',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      sales: '/api/sales',
      invoices: '/api/invoices',
      payments: '/api/payments',
      earnings: '/api/earnings',
      teams: '/api/teams',
      payouts: '/api/payouts',
      admin: '/api/admin'
    }
  });
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes and training routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/training/')) {
    return res.status(404).json({
      error: 'Endpoint niet gevonden',
      path: req.path,
      method: req.method
    });
  }

  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

app.use((error, req, res, next) => {
  console.error('Server fout:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validatiefout',
      details: Object.values(error.errors).map(err => err.message)
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Ongeldige ID format'
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      error: 'Duplicaat waarde voor uniek veld'
    });
  }

  res.status(500).json({
    error: 'Interne server fout',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server draait op poort ${PORT}`);
  console.log(`📍 API beschikbaar op: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);

  if (process.env.NODE_ENV === 'development') {
    console.log('\n📋 Beschikbare endpoints:');
    console.log('   POST /api/auth/register - Registreer nieuwe gebruiker');
    console.log('   POST /api/auth/login - Inloggen');
    console.log('   GET  /api/users - Gebruikers ophalen');
    console.log('   POST /api/sales - Sale registreren');
    console.log('   GET  /api/sales - Sales ophalen');
    console.log('   POST /api/invoices - Factuur aanmaken');
    console.log('   POST /api/payments/create-payment-intent - Stripe betaling');
    console.log('   GET  /api/earnings/summary - Verdiensten overzicht');
    console.log('   POST /api/payouts/generate - Payouts genereren');
    console.log('   GET  /api/admin/dashboard-stats - Admin dashboard\n');
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM ontvangen, server wordt afgesloten...');

  // Stop call updater
  callUpdater.stop();

  mongoose.connection.close(() => {
    console.log('MongoDB verbinding gesloten');
    process.exit(0);
  });
});

module.exports = app;