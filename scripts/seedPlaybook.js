require('dotenv').config();
const mongoose = require('mongoose');
const Playbook = require('../models/Playbook');

const playbookData = [
  {
    key: 'leadlist',
    title: 'Stap 1: Leadlijst - Snelle Kwalificatie',
    plainTextGuide: `
# Leadlijst Fase

## Doel
Snel bepalen of dit bedrijf potentieel heeft voor onze oplossing. Focus op fit, niet perfectie.

## Wat te doen
1. Voeg bedrijfsnaam, contactpersoon en basisgegevens toe
2. Noteer eerste indruk: past dit bij ons profiel?
3. Bepaal prioriteit (1-5) op basis van:
   - Bedrijfsgrootte
   - Industrie fit
   - Urgentie signalen

## Tijd investering
Max 5-10 minuten per lead. Als je twijfelt = ga door naar onderzoek.
    `,
    psychologyTips: [
      'Verlaag de drempel: "Ik hoef nog niks te verkopen, alleen te kwalificeren"',
      'Gebruik je intuïtie - eerste indruk klopt vaak',
      'Focus op volume in deze fase, niet perfectie',
      'Zie elke lead als leer-moment, niet als pressure'
    ],
    checkItems: [
      'Bedrijfsnaam en contactgegevens ingevoerd',
      'Prioriteit bepaald (1-5)',
      'Tags toegevoegd (industrie, grootte, etc.)',
      'Eerste indruk genoteerd'
    ],
    examplePhrases: [
      '"Deze lead past bij ons profiel omdat..."',
      '"Prioriteit 4/5 omdat ze recent groei laten zien"',
      '"Mogelijk interessant voor tijdbesparing in klantenservice"'
    ]
  },
  {
    key: 'research',
    title: 'Stap 2: Onderzoek - Pijnpunten & Besparing',
    plainTextGuide: `
# Onderzoek Fase

## Doel
Begrijp waar tijd en/of geld weglekt. Formuleer hypothese over potentiële besparing.

## Wat te doen
1. Zoek online naar het bedrijf (website, LinkedIn, reviews)
2. Identificeer mogelijke pijnpunten:
   - Waar besteden ze veel tijd aan die geautomatiseerd kan?
   - Waar lopen ze omzet/klanten mis?
   - Wat zijn hun strategische doelen?
3. Registreer besparing hypothese:
   - Hoeveel uur per maand kunnen ze besparen?
   - Hoeveel euro per maand?

## Kritische vraag
"Als ik dit bedrijf bel, wat is dan HUN probleem dat IK kan oplossen?"
    `,
    psychologyTips: [
      'Denk als consultant, niet als verkoper',
      'Zoek naar "jobs to be done" - wat proberen zij te bereiken?',
      'Noteer concrete voorbeelden en cijfers waar mogelijk',
      'Focus op hun pijn, niet jouw oplossing (nog niet!)'
    ],
    checkItems: [
      'Website en LinkedIn gecheckt',
      'Minimaal 2 pijnpunten geïdentificeerd',
      'Besparing hypothese ingevuld (tijd OF geld)',
      'Primaire doel bepaald (LEADS/REVENUE/EFFICIENCY)'
    ],
    examplePhrases: [
      '"Hun klantenservice team besteedt 40u/week aan repetitieve vragen"',
      '"Ze missen waarschijnlijk 20% leads door trage opvolging"',
      '"Hypothese: 80 uur/maand besparing door automatisering intake proces"'
    ]
  },
  {
    key: 'contact',
    title: 'Stap 3: Contact - Eerste Gesprek',
    plainTextGuide: `
# Contact Fase

## Doel
Eerste menselijk contact maken en interesse peilen. Kies 1 methode en volg door.

## Wat te doen
1. Kies contact methode:
   - **Cold Call**: Direct, persoonlijk, snelste feedback
   - **Email**: Minder interruptief, makkelijk te scalen
   - **In-Person**: Voor high-value leads, bouwt sterkste relatie

2. Log elke poging:
   - Methode
   - Uitkomst (CONNECTED / NO_ANSWER / REJECTED)
   - Korte notitie

3. Bij contact:
   - Bevestig pijnpunt uit research
   - Vraag naar succes criteria: "Wat moet gebeuren om dit een succes te maken?"
   - Pitch geen product, stel vragen!

## Vuistregel
3 pogingen zonder contact = email als fallback
    `,
    psychologyTips: [
      'Bij cold call: glimlach terwijl je belt (hoorbaar!)',
      'Eerste 10 seconden: wie ben je, waarom bel je, wat levert het op',
      'Voicemail? Wees kort en specifiek: "Ik zie dat jullie X doen, ik help met Y"',
      'Rejection = data. Vraag altijd: "Waarom niet?" voor toekomstig leren'
    ],
    checkItems: [
      'Contact methode gekozen',
      'Minimaal 1 poging gelogd',
      'Script/email voorbereid met pijnpunt',
      'Bij contact: pijnpunt bevestigd en interesse gepeild'
    ],
    examplePhrases: [
      '"Ik zag op jullie site dat jullie X aanbieden, klopt het dat jullie veel tijd kwijt zijn aan Y?"',
      '"Wat zou voor jou een succesvolle oplossing zijn?"',
      '"Als ik jullie 20 uur per week kan besparen, is dat interessant?"'
    ]
  },
  {
    key: 'present_finetune',
    title: 'Stap 4: Presentatie & Fine-tune',
    plainTextGuide: `
# Presentatie & Fine-tune Fase

## Doel
Laat zien hoe jouw oplossing hun specifieke pijnpunt oplost. Align op succes criteria.

## Wat te doen
1. Bereid presentatie/demo voor:
   - Start met HUN probleem (niet jouw product!)
   - Laat concrete ROI zien (tijd/geld besparing)
   - Demo relevante features, skip de rest

2. Fine-tune sessie:
   - Vraag: "Wat moet er aangepast om perfect te passen?"
   - Noteer alle aanpassingen
   - Agree op meetbare succes criteria

3. Belangrijkste vraag:
   "Als we dit precies zo doen, wat is dan jullie beslissing?"

## Valkuil
Niet te veel beloven! Better under-promise, over-deliver.
    `,
    psychologyTips: [
      'Maak het concreet: gebruik hun voorbeelden, hun cijfers',
      'Verlaag risico: bied pilot/trial aan indien mogelijk',
      'Social proof: "Bedrijf X had hetzelfde, nu besparen ze Y"',
      'Wees eerlijk over beperkingen - bouwt vertrouwen'
    ],
    checkItems: [
      'Demo/presentatie voorbereid met hun specifieke case',
      'ROI berekening gemaakt (tijd/geld)',
      'Aanpassingen genoteerd',
      'Succes criteria overeengekomen (meetbaar!)',
      'Vervolgstap bepaald (timing decision)'
    ],
    examplePhrases: [
      '"Jullie vertelden dat X een probleem is, laat me laten zien hoe we dat oplossen"',
      '"Op basis van 40u/week besparing à €50/uur = €8k/maand"',
      '"Wat zijn voor jullie de top 3 criteria om dit een succes te noemen?"'
    ]
  },
  {
    key: 'deal',
    title: 'Stap 5: Deal - Afsluiten',
    plainTextGuide: `
# Deal Fase

## Doel
Commitment krijgen of clear "no" + leren waarom.

## Wat te doen
1. Recap waarde:
   - Herhaal hun pijnpunt
   - Recap jouw oplossing
   - Herinner aan overeengekomen ROI en succes criteria

2. Vraag om de deal:
   - Direct: "Zullen we dit opstarten?"
   - Of: "Welke stappen moeten we zetten om te beginnen?"

3. Registreer resultaat:
   - **WON**: Dealwaarde, startdatum
   - **LOST**: Reden (te duur, geen prioriteit, concurrent, etc.)
   - **PENDING**: Concrete vervolgactie + deadline

## Bij WON
Vier het! En zet onboarding in gang.

## Bij LOST
Accepteer gracefully, vraag feedback, blijf contact houden.
    `,
    psychologyTips: [
      'Silence is power: na je vraag = stilte. Laat hen antwoorden.',
      'Objecties = koopsignalen. Vraag door: "Wat houdt je tegen?"',
      'Verlies = data. Elke "no" leert je voor volgende keer',
      'Bij twijfel: verlaag commitment (pilot, trial, kleiner pakket)'
    ],
    checkItems: [
      'Waarde samengevat (pijnpunt + oplossing + ROI)',
      'Vraag gesteld om commitment',
      'Resultaat vastgelegd (WON/LOST/PENDING)',
      'Bij WON: dealwaarde en startdatum',
      'Bij LOST: reden genoteerd voor leren',
      'Bij PENDING: concrete vervolgactie + deadline'
    ],
    examplePhrases: [
      '"We zijn het eens: jullie besparen X uur/maand, succes = Y. Zullen we starten?"',
      '"Wat zijn de laatste punten die we moeten afstemmen?"',
      '"Ik begrijp dat het nu niet past. Mag ik vragen wat de belangrijkste reden is?"',
      '"Laten we beginnen met een pilot van 1 maand, zodat jullie het risico laag houden"'
    ]
  }
];

async function seedPlaybook() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Verbonden met MongoDB');

    // Clear existing playbook
    await Playbook.deleteMany({});
    console.log('🗑️  Oude playbook data verwijderd');

    // Insert playbook data
    await Playbook.insertMany(playbookData);
    console.log('✅ Playbook data toegevoegd');

    console.log('\n📚 Playbook stappen:');
    playbookData.forEach(step => {
      console.log(`   - ${step.key}: ${step.title}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Klaar! Database verbinding gesloten.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fout bij seeden playbook:', error);
    process.exit(1);
  }
}

seedPlaybook();
