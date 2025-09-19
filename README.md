# Fyxed BV Sales Platform

Een volledig uitgeruste sales en commissie platform voor Fyxed BV met automatische commissie berekening, Stripe betalingen, factuur beheer en team management.

## 🚀 Features

- **Automatische Commissie Berekening**: 50% verkoper, 10% teamleider, 10% sponsor, min. 30% Fyxed
- **Stripe Integratie**: Online betalingen met automatische sale registratie
- **Factuur Management**: Offline facturen invoeren en beheren
- **Team Hiërarchie**: Sponsor/Leader/Agent structuur
- **Real-time Verdiensten**: Live earnings tracking en rapportages
- **Role-based Access**: Owner, Leader en Agent rechten
- **Payout Management**: Maandelijkse uitbetaling generatie
- **Admin Dashboard**: Volledige controle en overzichten

## 📋 Vereisten

- Node.js 18+
- MongoDB 5.0+
- Stripe Account
- NPM of Yarn

## ⚡ Quick Start

### 1. Installatie

```bash
cd sales.fyxedbv.nl
cp .env.example .env
npm install
```

### 2. Environment Setup

Bewerk `.env` met jouw gegevens:

```env
# Database
MONGO_URI=mongodb+srv://jouw-connection-string

# Authentication
JWT_SECRET=jouw-super-geheime-jwt-key-32-chars-minimum

# Stripe
STRIPE_SECRET_KEY=sk_test_jouw_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_jouw_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_jouw_webhook_secret

# App Configuration
PORT=3000
NODE_ENV=development
ADMIN_EMAIL=admin@fyxedbv.nl
BASE_URL=http://localhost:3000
```

### 3. Database Seeding

```bash
npm run seed
```

### 4. Server Starten

```bash
# Development
npm run dev

# Production
npm start
```

## 🧪 Test Accounts

Na seeding zijn de volgende test accounts beschikbaar:

| Email | Wachtwoord | Rol | Beschrijving |
|-------|-----------|-----|-------------|
| admin@fyxedbv.nl | admin123 | Owner | Volledige toegang |
| sponsor.a@fyxedbv.nl | sponsor123 | Leader | Sponsor niveau |
| leader.b@fyxedbv.nl | leader123 | Leader | Team leider |
| agent.c@fyxedbv.nl | agent123 | Agent | Agent in team |
| agent.d@fyxedbv.nl | agent123 | Agent | Agent in team |
| agent.e@fyxedbv.nl | agent123 | Agent | Standalone agent |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Nieuwe gebruiker registreren
- `POST /api/auth/login` - Inloggen
- `GET /api/auth/me` - Huidige gebruiker info

### Sales Management
- `POST /api/sales` - Sale registreren
- `GET /api/sales` - Sales ophalen (gefilterd op rol)
- `PATCH /api/sales/:id` - Sale status wijzigen

### Payments (Stripe)
- `POST /api/payments/create-payment-intent` - Payment intent aanmaken
- `POST /api/payments/webhook` - Stripe webhook handler
- `GET /api/payments/status/:id` - Payment status ophalen

### Invoices
- `POST /api/invoices` - Offline factuur aanmaken
- `GET /api/invoices` - Facturen ophalen
- `PATCH /api/invoices/:id/mark-paid` - Factuur als betaald markeren

### Earnings
- `GET /api/earnings/summary` - Verdiensten overzicht
- `GET /api/earnings/team` - Team verdiensten
- `GET /api/earnings/breakdown` - Gedetailleerde breakdown

### Teams
- `GET /api/teams` - Teams ophalen
- `POST /api/teams` - Team aanmaken
- `PATCH /api/teams/:id/add-member` - Teamlid toevoegen

### Payouts
- `POST /api/payouts/generate` - Payouts genereren voor periode
- `GET /api/payouts` - Payouts ophalen
- `PATCH /api/payouts/:id/mark-paid` - Payout als betaald markeren

### Admin
- `GET /api/admin/dashboard-stats` - Dashboard statistieken
- `PUT /api/admin/settings` - Instellingen bijwerken
- `POST /api/admin/recompute-sales` - Sales herberekenen

## 💡 Gebruik Voorbeelden

### Sale Registreren

```bash
curl -X POST http://localhost:3000/api/sales \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sellerId": "USER_ID",
    "amount": 1000,
    "currency": "EUR",
    "customer": {
      "name": "Test Klant",
      "company": "Test BV",
      "contact": "test@example.com"
    },
    "meta": {
      "source": "lead-activation",
      "notes": "Nieuwe klant via website"
    }
  }'
```

### Stripe Payment Intent

```bash
curl -X POST http://localhost:3000/api/payments/create-payment-intent \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1000,
    "currency": "eur",
    "sellerId": "USER_ID",
    "customerInfo": {
      "name": "Klant Naam"
    }
  }'
```

### Verdiensten Ophalen

```bash
curl -X GET "http://localhost:3000/api/earnings/summary?startDate=2024-01-01&endDate=2024-12-31" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🏗️ Project Structuur

```
sales.fyxedbv.nl/
├── models/          # Mongoose schemas
│   ├── User.js      # Gebruikers model
│   ├── Sale.js      # Sales model
│   ├── Invoice.js   # Facturen model
│   ├── Team.js      # Teams model
│   ├── Payout.js    # Payouts model
│   └── Settings.js  # Instellingen model
├── routes/          # Express routes
│   ├── auth.js      # Authenticatie routes
│   ├── sales.js     # Sales routes
│   ├── invoices.js  # Factuur routes
│   ├── payments.js  # Stripe payment routes
│   ├── earnings.js  # Verdiensten routes
│   ├── teams.js     # Team management routes
│   ├── payouts.js   # Payout routes
│   └── admin.js     # Admin routes
├── middleware/      # Express middleware
│   ├── auth.js      # JWT authenticatie
│   └── validation.js # Input validatie
├── utils/           # Utility functies
│   ├── calculations.js # Commissie berekeningen
│   ├── stripe.js    # Stripe integratie
│   └── invoices.js  # Factuur utilities
├── scripts/         # Database scripts
│   └── seed.js      # Database seeding
├── server.js        # Main server file
├── package.json     # Dependencies
└── README.md        # Deze file
```

## 💰 Commissie Berekening

Het systeem hanteert een vast commissie model:

- **Verkoper**: 50% van de sale
- **Teamleider** (1e laag): 10% van de sale
- **Sponsor** (2e laag): 10% van de sale
- **Fyxed BV**: Minimum 30% van de sale

### Voorbeelden:

**Volledige hiërarchie (€1000 sale):**
- Verkoper: €500 (50%)
- Teamleider: €100 (10%)
- Sponsor: €100 (10%)
- Fyxed: €300 (30%)

**Verkoper zonder teamleider (€1000 sale):**
- Verkoper: €500 (50%)
- Fyxed: €500 (50%)

## 🔒 Security Features

- JWT authenticatie met 7-dagen expiry
- Role-based access control
- Rate limiting (100 req/15min, 5 login attempts/15min)
- Helmet.js security headers
- Input validatie met express-validator
- CORS configuratie
- Stripe webhook signature verificatie

## 🚀 Deployment

### Docker (Aanbevolen)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Vercel/Railway

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### VPS/Server

```bash
# PM2 voor process management
npm install -g pm2
pm2 start server.js --name "fyxed-sales"
pm2 startup
pm2 save
```

## 🔧 Development

### Scripts

```bash
npm run dev      # Development server met nodemon
npm run start    # Production server
npm run seed     # Database seeding
npm run test     # Run tests (indien aanwezig)
```

### Database Indexen

Het systeem maakt automatisch de volgende indexen aan:
- Users: email, sponsorId, role+active
- Sales: sellerId+createdAt, leaderId+createdAt, sponsorId+createdAt
- Invoices: invoiceNumber, sellerId+createdAt, status

## 📊 Monitoring & Analytics

### Health Check

```bash
curl http://localhost:3000/api/health
```

### System Health (Admin)

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \\
     http://localhost:3000/api/admin/system-health
```

## 🐛 Troubleshooting

### Database Verbinding

```bash
# Test MongoDB verbinding
node -e "require('mongoose').connect(process.env.MONGO_URI).then(() => console.log('OK')).catch(console.error)"
```

### Stripe Webhooks

1. Gebruik ngrok voor lokale testing:
```bash
ngrok http 3000
```

2. Configureer webhook URL in Stripe Dashboard:
```
https://your-ngrok-url.ngrok.io/api/payments/webhook
```

### Common Issues

- **JWT Token Expired**: Login opnieuw
- **Permission Denied**: Controleer gebruikersrol
- **Validation Error**: Controleer input formaat
- **Stripe Error**: Verificeer API keys en webhook secret

## 📝 Contributing

1. Fork het project
2. Maak feature branch (`git checkout -b feature/amazing-feature`)
3. Commit wijzigingen (`git commit -m 'Add amazing feature'`)
4. Push naar branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

Dit project is eigendom van Fyxed BV. Alle rechten voorbehouden.

## 📞 Support

Voor support en vragen:
- Email: tech@fyxedbv.nl
- GitHub Issues: [Create Issue](https://github.com/fyxedbv/sales-platform/issues)

---

**Fyxed BV Sales Platform v1.0.0**
*Gebouwd met ❤️ door het Fyxed team*