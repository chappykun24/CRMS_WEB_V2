#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 CRMS Web v2 - Neon Database Setup\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env.local file...');
  
  const envContent = `# Neon Database Configuration
VITE_NEON_HOST=your-host.neon.tech
VITE_NEON_DATABASE=your-database-name
VITE_NEON_USER=your-username
VITE_NEON_PASSWORD=your-password
VITE_NEON_PORT=5432

# Alternative names for server-side
NEON_HOST=your-host.neon.tech
NEON_DATABASE=your-database-name
NEON_USER=your-username
NEON_PASSWORD=your-password
NEON_PORT=5432

# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_API_TIMEOUT=10000

# App Configuration
VITE_APP_NAME=CRMS Web v2
VITE_APP_VERSION=2.0.0
VITE_APP_ENVIRONMENT=development
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local file created!');
  console.log('⚠️  Please edit this file with your actual Neon credentials\n');
} else {
  console.log('✅ .env.local file already exists\n');
}

// Check dependencies
console.log('📦 Checking dependencies...');
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const requiredDeps = ['pg', 'dotenv'];
const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);

if (missingDeps.length > 0) {
  console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
  console.log('Run: npm install\n');
} else {
  console.log('✅ All required dependencies are installed\n');
}

// Check if database config exists
const dbConfigPath = path.join(__dirname, 'src/config/database.js');
if (fs.existsSync(dbConfigPath)) {
  console.log('✅ Database configuration file exists');
} else {
  console.log('❌ Database configuration file missing');
}

// Check if database service exists
const dbServicePath = path.join(__dirname, 'src/services/databaseService.js');
if (fs.existsSync(dbServicePath)) {
  console.log('✅ Database service file exists');
} else {
  console.log('❌ Database service file missing');
}

console.log('\n📋 Next Steps:');
console.log('1. Edit .env.local with your Neon database credentials');
console.log('2. Run: npm run db:setup');
console.log('3. Test connection: node test-db.js');
console.log('4. Start development: npm run dev');

console.log('\n🔗 Get your Neon credentials from: https://neon.tech');
console.log('📚 Full setup guide: NEON_DATABASE_SETUP.md');

if (!envExists) {
  console.log('\n⚠️  IMPORTANT: Edit .env.local with your actual Neon credentials before proceeding!');
}
