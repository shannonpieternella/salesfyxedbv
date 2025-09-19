require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Team = require('../models/Team');
const Settings = require('../models/Settings');
const Invoice = require('../models/Invoice');
const { computeShares } = require('../utils/calculations');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Verbonden met MongoDB voor seeding');
  } catch (error) {
    console.error('❌ MongoDB verbinding fout:', error);
    process.exit(1);
  }
}

async function clearDatabase() {
  try {
    await User.deleteMany({});
    await Sale.deleteMany({});
    await Team.deleteMany({});
    await Settings.deleteMany({});
    await Invoice.deleteMany({});
    console.log('🗑️  Database geleegd');
  } catch (error) {
    console.error('❌ Fout bij legen database:', error);
  }
}

async function createSettings() {
  try {
    const settings = new Settings({
      plan: 'default',
      shares: {
        seller: 0.5,
        leader: 0.10,
        sponsor: 0.10,
        fyxedMin: 0.30
      },
      pricing: {
        leadActivationPerLead: 50,
        baseRetainerMin: 1000,
        customizationMultiplierCap: 20000
      },
      invoice: {
        defaultVatRate: 21,
        paymentTermsDays: 30,
        company: {
          name: 'Fyxed BV',
          address: {
            street: 'Teststraat 123',
            city: 'Amsterdam',
            zipCode: '1000 AA',
            country: 'Nederland'
          },
          kvk: '12345678',
          vatNumber: 'NL123456789B01',
          bankAccount: 'NL91ABNA0417164300'
        }
      }
    });

    await settings.save();
    console.log('⚙️  Standaard instellingen aangemaakt');
    return settings;
  } catch (error) {
    console.error('❌ Fout bij aanmaken instellingen:', error);
  }
}

async function createUsers() {
  try {
    const admin = new User({
      name: 'Fyxed Admin',
      email: 'admin@fyxedbv.nl',
      password_hash: 'admin123',
      role: 'owner',
      phone: '+31612345678',
      active: true
    });
    await admin.save();

    const sponsorA = new User({
      name: 'Sponsor A',
      email: 'sponsor.a@fyxedbv.nl',
      password_hash: 'sponsor123',
      role: 'leader',
      phone: '+31612345679',
      active: true
    });
    await sponsorA.save();

    const leaderB = new User({
      name: 'Teamleider B',
      email: 'leader.b@fyxedbv.nl',
      password_hash: 'leader123',
      role: 'leader',
      phone: '+31612345680',
      sponsorId: sponsorA._id,
      active: true
    });
    await leaderB.save();

    const agentC = new User({
      name: 'Agent C',
      email: 'agent.c@fyxedbv.nl',
      password_hash: 'agent123',
      role: 'agent',
      phone: '+31612345681',
      sponsorId: leaderB._id,
      active: true
    });
    await agentC.save();

    const agentD = new User({
      name: 'Agent D',
      email: 'agent.d@fyxedbv.nl',
      password_hash: 'agent123',
      role: 'agent',
      phone: '+31612345682',
      sponsorId: leaderB._id,
      active: true
    });
    await agentD.save();

    const agentE = new User({
      name: 'Agent E (Standalone)',
      email: 'agent.e@fyxedbv.nl',
      password_hash: 'agent123',
      role: 'agent',
      phone: '+31612345683',
      active: true
    });
    await agentE.save();

    console.log('👥 Test gebruikers aangemaakt:');
    console.log(`   🔑 Admin: ${admin.email} / admin123`);
    console.log(`   👨‍💼 Sponsor A: ${sponsorA.email} / sponsor123`);
    console.log(`   👨‍💼 Teamleider B: ${leaderB.email} / leader123`);
    console.log(`   🤝 Agent C: ${agentC.email} / agent123`);
    console.log(`   🤝 Agent D: ${agentD.email} / agent123`);
    console.log(`   🤝 Agent E: ${agentE.email} / agent123`);

    return { admin, sponsorA, leaderB, agentC, agentD, agentE };
  } catch (error) {
    console.error('❌ Fout bij aanmaken gebruikers:', error);
  }
}

async function createTeams(users) {
  try {
    const { leaderB, agentC, agentD } = users;

    const team = new Team({
      name: 'Team B Alpha',
      leaderId: leaderB._id,
      memberIds: [agentC._id, agentD._id],
      description: 'Hoofdteam onder leider B'
    });

    await team.save();
    console.log('🏆 Test team aangemaakt: Team B Alpha');
    return team;
  } catch (error) {
    console.error('❌ Fout bij aanmaken teams:', error);
  }
}

async function createSales(users) {
  try {
    const { agentC, agentD, agentE } = users;

    const salesData = [
      {
        sellerId: agentC._id,
        amount: 1000,
        customer: { name: 'Klant 1', company: 'Bedrijf A', contact: 'info@bedrijfa.nl' },
        meta: { source: 'lead-activation', notes: 'Test sale 1' }
      },
      {
        sellerId: agentC._id,
        amount: 2500,
        customer: { name: 'Klant 2', company: 'Bedrijf B', contact: 'info@bedrijfb.nl' },
        meta: { source: 'retainer', notes: 'Test sale 2' }
      },
      {
        sellerId: agentD._id,
        amount: 1500,
        customer: { name: 'Klant 3', company: 'Bedrijf C', contact: 'info@bedrijfc.nl' },
        meta: { source: 'custom', notes: 'Test sale 3' }
      },
      {
        sellerId: agentD._id,
        amount: 3000,
        customer: { name: 'Klant 4', company: 'Bedrijf D', contact: 'info@bedrijfd.nl' },
        meta: { source: 'custom', notes: 'Test sale 4' }
      },
      {
        sellerId: agentE._id,
        amount: 800,
        customer: { name: 'Klant 5', company: 'Bedrijf E', contact: 'info@bedrijfe.nl' },
        meta: { source: 'lead-activation', notes: 'Test sale standalone agent' }
      }
    ];

    const createdSales = [];

    for (const saleData of salesData) {
      const calculation = await computeShares(saleData.amount, saleData.sellerId);

      const sale = new Sale({
        sellerId: saleData.sellerId,
        amount: saleData.amount,
        currency: 'EUR',
        customer: saleData.customer,
        meta: saleData.meta,
        computed: {
          leaderId: calculation.leaderId,
          sponsorId: calculation.sponsorId,
          sellerShare: calculation.sellerShare,
          leaderShare: calculation.leaderShare,
          sponsorShare: calculation.sponsorShare,
          fyxedShare: calculation.fyxedShare
        },
        status: 'approved'
      });

      await sale.save();
      createdSales.push(sale);
    }

    console.log('💰 Test sales aangemaakt:');
    for (const sale of createdSales) {
      const seller = await User.findById(sale.sellerId);
      console.log(`   €${sale.amount} - ${seller.name} (${sale.meta.source})`);
      console.log(`     Verdeling: Verkoper €${sale.computed.sellerShare}, Leider €${sale.computed.leaderShare}, Sponsor €${sale.computed.sponsorShare}, Fyxed €${sale.computed.fyxedShare}`);
    }

    return createdSales;
  } catch (error) {
    console.error('❌ Fout bij aanmaken sales:', error);
  }
}

async function createInvoices(users) {
  try {
    const { agentC, agentD } = users;

    const invoice1 = new Invoice({
      invoiceNumber: 'FY20241001',
      sellerId: agentC._id,
      customer: {
        name: 'Test Klant BV',
        company: 'Test Klant BV',
        email: 'factuur@testklant.nl',
        address: {
          street: 'Klantstraat 456',
          city: 'Rotterdam',
          zipCode: '3000 AA',
          country: 'Nederland'
        },
        vatNumber: 'NL987654321B01'
      },
      items: [
        {
          description: 'Lead Activatie Service',
          quantity: 10,
          unitPrice: 50,
          total: 500
        },
        {
          description: 'Retainer Management',
          quantity: 1,
          unitPrice: 1000,
          total: 1000
        }
      ],
      totals: {
        subtotal: 1500,
        vatRate: 21,
        vatAmount: 315,
        total: 1815
      },
      dates: {
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      status: 'sent',
      paymentMethod: 'bank-transfer'
    });

    await invoice1.save();

    const invoice2 = new Invoice({
      invoiceNumber: 'FY20241002',
      sellerId: agentD._id,
      customer: {
        name: 'Andere Klant',
        company: 'Andere Klant BV',
        email: 'info@andereklant.nl'
      },
      items: [
        {
          description: 'Custom Development',
          quantity: 1,
          unitPrice: 2500,
          total: 2500
        }
      ],
      totals: {
        subtotal: 2500,
        vatRate: 21,
        vatAmount: 525,
        total: 3025
      },
      dates: {
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      status: 'paid',
      paymentMethod: 'stripe'
    });

    await invoice2.save();

    console.log('🧾 Test facturen aangemaakt:');
    console.log(`   ${invoice1.invoiceNumber} - €${invoice1.totals.total} (${invoice1.status})`);
    console.log(`   ${invoice2.invoiceNumber} - €${invoice2.totals.total} (${invoice2.status})`);

    return [invoice1, invoice2];
  } catch (error) {
    console.error('❌ Fout bij aanmaken facturen:', error);
  }
}

async function validateData() {
  try {
    console.log('\n🔍 Validatie van aangemaakte data:');

    const userCount = await User.countDocuments();
    const salesCount = await Sale.countDocuments();
    const teamCount = await Team.countDocuments();
    const invoiceCount = await Invoice.countDocuments();

    console.log(`   Gebruikers: ${userCount}`);
    console.log(`   Sales: ${salesCount}`);
    console.log(`   Teams: ${teamCount}`);
    console.log(`   Facturen: ${invoiceCount}`);

    const totalRevenue = await Sale.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    if (totalRevenue.length > 0) {
      console.log(`   Totale omzet: €${totalRevenue[0].total}`);
    }

    const commissieBreakdown = await Sale.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: null,
          verkopers: { $sum: '$computed.sellerShare' },
          leiders: { $sum: '$computed.leaderShare' },
          sponsors: { $sum: '$computed.sponsorShare' },
          fyxed: { $sum: '$computed.fyxedShare' }
        }
      }
    ]);

    if (commissieBreakdown.length > 0) {
      const breakdown = commissieBreakdown[0];
      console.log(`   Commissie verdeling:`);
      console.log(`     Verkopers: €${breakdown.verkopers.toFixed(2)}`);
      console.log(`     Leiders: €${breakdown.leiders.toFixed(2)}`);
      console.log(`     Sponsors: €${breakdown.sponsors.toFixed(2)}`);
      console.log(`     Fyxed: €${breakdown.fyxed.toFixed(2)}`);
    }

    console.log('\n✅ Data validatie voltooid');
  } catch (error) {
    console.error('❌ Fout bij validatie:', error);
  }
}

async function seed() {
  console.log('🌱 Start seeding database...\n');

  await connectDB();
  await clearDatabase();

  const settings = await createSettings();
  const users = await createUsers();
  const team = await createTeams(users);
  const sales = await createSales(users);
  const invoices = await createInvoices(users);

  await validateData();

  console.log('\n🎉 Seeding voltooid!');
  console.log('\n📋 Test accounts:');
  console.log('   admin@fyxedbv.nl / admin123 (Owner)');
  console.log('   sponsor.a@fyxedbv.nl / sponsor123 (Leader)');
  console.log('   leader.b@fyxedbv.nl / leader123 (Leader)');
  console.log('   agent.c@fyxedbv.nl / agent123 (Agent)');
  console.log('   agent.d@fyxedbv.nl / agent123 (Agent)');
  console.log('   agent.e@fyxedbv.nl / agent123 (Agent - standalone)');
  console.log('\n📡 Start de server met: npm run dev');
  console.log('📍 API: http://localhost:3000/api');

  await mongoose.connection.close();
}

if (require.main === module) {
  seed().catch(error => {
    console.error('❌ Seeding gefaald:', error);
    process.exit(1);
  });
}

module.exports = seed;