require('dotenv').config();
const { execSync } = require('child_process');

console.log('🌱 Starting full database seed...\n');

try {
  console.log('1️⃣  Seeding Playbook...');
  execSync('node scripts/seedPlaybook.js', { stdio: 'inherit' });

  console.log('\n2️⃣  Seeding Companies...');
  execSync('node scripts/seedCompanies.js', { stdio: 'inherit' });

  console.log('\n✅ All seed scripts completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Seed failed:', error.message);
  process.exit(1);
}
