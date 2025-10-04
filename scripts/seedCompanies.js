require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../models/Company');
const Activity = require('../models/Activity');
const User = require('../models/User');

async function seedCompanies() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Verbonden met MongoDB');

    // Find agents (or create demo agents if none exist)
    let agents = await User.find({ role: 'agent' });

    if (agents.length === 0) {
      console.log('⚠️  Geen agents gevonden. Maak eerst een agent aan of pas de seed aan.');
      await mongoose.connection.close();
      process.exit(1);
    }

    const agent = agents[0]; // Use first agent for demo

    // Clear existing companies and activities
    await Company.deleteMany({});
    await Activity.deleteMany({});
    console.log('🗑️  Oude company data verwijderd');

    // Demo companies data
    const companiesData = [
      {
        agentId: agent._id,
        name: 'TechStart BV',
        contactPerson: 'Jan Jansen',
        phone: '+31612345678',
        email: 'jan@techstart.nl',
        website: 'https://techstart.nl',
        tags: ['tech', 'saas', 'startup'],
        priority: 5,
        goals: {
          primary: 'LEADS',
          description: 'Meer leads genereren via website'
        },
        savingsHypothesis: {
          timeHoursPerMonth: 60,
          costPerMonth: 3000,
          notes: 'Handmatig lead qualification kost 15u/week'
        },
        currentPhase: 'deal',
        stepState: {
          leadlist: {
            status: 'DONE',
            startedAt: new Date('2024-01-01'),
            completedAt: new Date('2024-01-02'),
            notes: 'Goede fit, tech startup met groei'
          },
          research: {
            status: 'DONE',
            startedAt: new Date('2024-01-02'),
            completedAt: new Date('2024-01-05'),
            notes: 'Website analyse gedaan',
            findings: ['Veel traffic maar lage conversie', 'Geen chat/bot'],
            painPoints: ['Lead opvolging te traag', 'Sales team overbelast']
          },
          contact: {
            status: 'DONE',
            startedAt: new Date('2024-01-05'),
            completedAt: new Date('2024-01-08'),
            notes: 'Goed gesprek, interesse',
            method: 'COLD_CALL',
            attempts: [
              { method: 'COLD_CALL', outcome: 'NO_ANSWER', at: new Date('2024-01-05'), notes: 'Voicemail ingesproken' },
              { method: 'COLD_CALL', outcome: 'CONNECTED', at: new Date('2024-01-06'), notes: 'Gesprek van 15 min' }
            ]
          },
          present_finetune: {
            status: 'DONE',
            startedAt: new Date('2024-01-08'),
            completedAt: new Date('2024-01-12'),
            notes: 'Demo gegeven, positieve reactie',
            adjustments: ['Custom branding gewenst', 'Integratie met HubSpot'],
            agreedSuccessCriteria: ['30% meer leads', '50% snellere opvolging']
          },
          deal: {
            status: 'DONE',
            startedAt: new Date('2024-01-12'),
            completedAt: new Date('2024-01-15'),
            notes: 'Deal gesloten!',
            result: 'WON',
            valueEUR: 5000
          }
        },
        checklist: [
          { label: 'Contract sturen', checked: true, updatedAt: new Date('2024-01-14') },
          { label: 'Onboarding inplannen', checked: true, updatedAt: new Date('2024-01-15') },
          { label: 'HubSpot integratie opzetten', checked: false, updatedAt: new Date('2024-01-15') }
        ]
      },
      {
        agentId: agent._id,
        name: 'Retail Solutions NL',
        contactPerson: 'Marie de Vries',
        phone: '+31687654321',
        email: 'marie@retailsolutions.nl',
        tags: ['retail', 'e-commerce'],
        priority: 4,
        goals: {
          primary: 'EFFICIENCY',
          description: 'Klantenservice efficiënter maken'
        },
        savingsHypothesis: {
          timeHoursPerMonth: 120,
          costPerMonth: 6000,
          notes: 'Support team beantwoordt veel dezelfde vragen'
        },
        currentPhase: 'present_finetune',
        stepState: {
          leadlist: {
            status: 'DONE',
            startedAt: new Date('2024-01-10'),
            completedAt: new Date('2024-01-10'),
            notes: 'Inbound lead via website'
          },
          research: {
            status: 'DONE',
            startedAt: new Date('2024-01-10'),
            completedAt: new Date('2024-01-12'),
            notes: 'E-commerce met 10k orders/maand',
            findings: ['Veel support tickets', 'Lange wachttijden'],
            painPoints: ['80% vragen zijn repetitief', 'Support team onderbezet']
          },
          contact: {
            status: 'DONE',
            startedAt: new Date('2024-01-12'),
            completedAt: new Date('2024-01-13'),
            notes: 'Email contact, snel antwoord',
            method: 'EMAIL',
            attempts: [
              { method: 'EMAIL', outcome: 'CONNECTED', at: new Date('2024-01-12'), notes: 'Uitnodiging voor call gestuurd' }
            ]
          },
          present_finetune: {
            status: 'IN_PROGRESS',
            startedAt: new Date('2024-01-15'),
            notes: 'Demo gepland voor volgende week',
            adjustments: [],
            agreedSuccessCriteria: []
          },
          deal: {
            status: 'NOT_STARTED',
            notes: ''
          }
        },
        checklist: [
          { label: 'Demo voorbereiden', checked: true, updatedAt: new Date() },
          { label: 'ROI calculatie maken', checked: false, updatedAt: new Date() }
        ]
      },
      {
        agentId: agent._id,
        name: 'FinTech Innovations',
        contactPerson: 'Pieter Smit',
        phone: '+31698765432',
        email: 'p.smit@fintech-innov.nl',
        tags: ['fintech', 'b2b'],
        priority: 5,
        goals: {
          primary: 'REVENUE',
          description: 'Meer omzet door betere conversie'
        },
        savingsHypothesis: {
          timeHoursPerMonth: 40,
          costPerMonth: 10000,
          notes: 'Verloren deals door trage response tijd'
        },
        currentPhase: 'contact',
        stepState: {
          leadlist: {
            status: 'DONE',
            startedAt: new Date('2024-01-18'),
            completedAt: new Date('2024-01-18'),
            notes: 'LinkedIn outreach'
          },
          research: {
            status: 'DONE',
            startedAt: new Date('2024-01-18'),
            completedAt: new Date('2024-01-20'),
            notes: 'FinTech met B2B focus',
            findings: ['Groeiend bedrijf', 'Veel inbound interest'],
            painPoints: ['Sales team kan niet snel genoeg reageren', 'Kwalificatie kost veel tijd']
          },
          contact: {
            status: 'IN_PROGRESS',
            startedAt: new Date('2024-01-22'),
            notes: 'Nog geen contact',
            method: 'COLD_CALL',
            attempts: [
              { method: 'COLD_CALL', outcome: 'NO_ANSWER', at: new Date('2024-01-22'), notes: 'Voicemail' },
              { method: 'EMAIL', outcome: 'NO_ANSWER', at: new Date('2024-01-23'), notes: 'Follow-up email' }
            ]
          },
          present_finetune: {
            status: 'NOT_STARTED'
          },
          deal: {
            status: 'NOT_STARTED'
          }
        },
        checklist: [
          { label: 'LinkedIn connectie maken', checked: true, updatedAt: new Date() },
          { label: 'In-person meeting proberen', checked: false, updatedAt: new Date() }
        ]
      },
      {
        agentId: agent._id,
        name: 'HealthCare Connect',
        contactPerson: 'Dr. Lisa Bakker',
        email: 'l.bakker@healthcare-connect.nl',
        tags: ['healthcare', 'saas'],
        priority: 3,
        goals: {
          primary: 'EFFICIENCY',
          description: 'Patiënt intake proces versnellen'
        },
        currentPhase: 'research',
        stepState: {
          leadlist: {
            status: 'DONE',
            startedAt: new Date('2024-01-25'),
            completedAt: new Date('2024-01-25'),
            notes: 'Referral van andere klant'
          },
          research: {
            status: 'IN_PROGRESS',
            startedAt: new Date('2024-01-25'),
            notes: 'Research nog bezig',
            findings: ['Healthcare platform', 'Veel handmatige intake'],
            painPoints: []
          },
          contact: {
            status: 'NOT_STARTED'
          },
          present_finetune: {
            status: 'NOT_STARTED'
          },
          deal: {
            status: 'NOT_STARTED'
          }
        },
        checklist: []
      },
      {
        agentId: agent._id,
        name: 'BuildCo Projects',
        contactPerson: 'Tom van der Berg',
        phone: '+31611223344',
        email: 'tom@buildco.nl',
        tags: ['construction', 'b2b'],
        priority: 2,
        goals: {
          primary: 'LEADS',
          description: 'Meer projecten binnenhalen'
        },
        currentPhase: 'deal',
        stepState: {
          leadlist: {
            status: 'DONE',
            startedAt: new Date('2024-01-05'),
            completedAt: new Date('2024-01-05'),
            notes: 'Cold outreach'
          },
          research: {
            status: 'DONE',
            startedAt: new Date('2024-01-05'),
            completedAt: new Date('2024-01-06'),
            notes: 'Bouw bedrijf, mid-size',
            findings: ['Traditionele marketing', 'Weinig online presence'],
            painPoints: ['Te afhankelijk van netwerk', 'Geen lead generation systeem']
          },
          contact: {
            status: 'DONE',
            startedAt: new Date('2024-01-08'),
            completedAt: new Date('2024-01-10'),
            notes: 'Face-to-face meeting',
            method: 'IN_PERSON',
            attempts: [
              { method: 'IN_PERSON', outcome: 'CONNECTED', at: new Date('2024-01-10'), notes: 'Meeting op kantoor' }
            ]
          },
          present_finetune: {
            status: 'DONE',
            startedAt: new Date('2024-01-12'),
            completedAt: new Date('2024-01-15'),
            notes: 'Demo, maar sceptisch',
            adjustments: ['Eenvoudiger dashboard', 'Focus op ROI'],
            agreedSuccessCriteria: ['5 nieuwe leads per maand']
          },
          deal: {
            status: 'DONE',
            startedAt: new Date('2024-01-16'),
            completedAt: new Date('2024-01-18'),
            notes: 'Te duur, geen budget',
            result: 'LOST'
          }
        },
        checklist: []
      }
    ];

    // Insert companies
    const companies = await Company.insertMany(companiesData);
    console.log(`✅ ${companies.length} demo bedrijven toegevoegd`);

    // Create activity logs for each company
    for (const company of companies) {
      await Activity.log(company._id, agent._id, 'CREATE', {
        companyName: company.name
      });

      // Add some step update activities
      if (company.stepState.research.status === 'DONE') {
        await Activity.log(company._id, agent._id, 'UPDATE_STEP', {
          stepKey: 'research',
          updates: { status: 'DONE' }
        });
      }

      if (company.stepState.contact.status !== 'NOT_STARTED') {
        await Activity.log(company._id, agent._id, 'UPDATE_STEP', {
          stepKey: 'contact',
          updates: { status: company.stepState.contact.status }
        });
      }
    }

    console.log('✅ Activity logs toegevoegd');

    console.log('\n📊 Demo bedrijven per fase:');
    const phaseCounts = {};
    companies.forEach(c => {
      phaseCounts[c.currentPhase] = (phaseCounts[c.currentPhase] || 0) + 1;
    });

    Object.entries(phaseCounts).forEach(([phase, count]) => {
      console.log(`   - ${phase}: ${count}`);
    });

    console.log('\n📈 Deal resultaten:');
    const won = companies.filter(c => c.stepState.deal.result === 'WON').length;
    const lost = companies.filter(c => c.stepState.deal.result === 'LOST').length;
    console.log(`   - WON: ${won}`);
    console.log(`   - LOST: ${lost}`);

    await mongoose.connection.close();
    console.log('\n✅ Klaar! Database verbinding gesloten.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fout bij seeden companies:', error);
    process.exit(1);
  }
}

seedCompanies();
