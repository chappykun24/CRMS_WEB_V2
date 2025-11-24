#!/usr/bin/env node

/**
 * Railway Deployment Script
 * Automates the deployment of ILO Clustering API to Railway
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Deployment Script for ILO Clustering API');
console.log('==================================================\n');

// Check if Railway CLI is installed
function checkRailwayCLI() {
  try {
    execSync('railway --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Main deployment function
async function deploy() {
  console.log('📋 Step 1: Checking prerequisites...\n');
  
  // Check Railway CLI
  if (!checkRailwayCLI()) {
    console.log('❌ Railway CLI not found!');
    console.log('\n📦 Installing Railway CLI...\n');
    console.log('Please run one of these commands to install:');
    console.log('  npm install -g @railway/cli');
    console.log('  OR (Windows):');
    console.log('  iwr https://railway.app/install.ps1 -useb | iex');
    console.log('  OR (Linux/Mac):');
    console.log('  curl -fsSL https://railway.app/install.sh | sh\n');
    console.log('After installing, run this script again.\n');
    process.exit(1);
  }
  
  console.log('✅ Railway CLI found\n');
  
  // Change to the service directory
  const serviceDir = path.join(__dirname);
  process.chdir(serviceDir);
  console.log(`📁 Working directory: ${serviceDir}\n`);
  
  // Check if logged in
  console.log('📋 Step 2: Checking Railway login status...\n');
  try {
    execSync('railway whoami', { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Not logged in to Railway');
    console.log('\n🔐 Please login first:');
    console.log('  railway login\n');
    console.log('After logging in, run this script again.\n');
    process.exit(1);
  }
  
  console.log('\n✅ Logged in to Railway\n');
  
  // Check if already linked
  console.log('📋 Step 3: Checking project link...\n');
  const railwayJsonPath = path.join(serviceDir, '.railway', 'link.json');
  const isLinked = fs.existsSync(railwayJsonPath);
  
  if (!isLinked) {
    console.log('📦 Linking to Railway project...');
    console.log('Please select or create a project when prompted.\n');
    try {
      execSync('railway link', { stdio: 'inherit' });
    } catch (error) {
      console.log('\n❌ Failed to link project');
      console.log('Please run: railway link\n');
      process.exit(1);
    }
  } else {
    console.log('✅ Already linked to Railway project\n');
  }
  
  // Check environment variables
  console.log('📋 Step 4: Checking environment variables...\n');
  try {
    const vars = execSync('railway variables', { encoding: 'utf-8' });
    console.log('Current environment variables:');
    console.log(vars);
    
    if (!vars.includes('DATABASE_URL')) {
      console.log('\n⚠️  DATABASE_URL not found!');
      console.log('Please set it using:');
      console.log('  railway variables set DATABASE_URL="your-database-url"\n');
    } else {
      console.log('\n✅ DATABASE_URL is set\n');
    }
  } catch (error) {
    console.log('⚠️  Could not check variables');
  }
  
  // Deploy
  console.log('📋 Step 5: Deploying to Railway...\n');
  console.log('This may take a few minutes...\n');
  
  try {
    execSync('railway up', { stdio: 'inherit' });
    console.log('\n✅ Deployment initiated!\n');
  } catch (error) {
    console.log('\n❌ Deployment failed');
    console.log('Check the error messages above for details.\n');
    process.exit(1);
  }
  
  // Get domain
  console.log('📋 Step 6: Getting service URL...\n');
  try {
    const domain = execSync('railway domain', { encoding: 'utf-8' }).trim();
    console.log('✅ Your Railway service URL:');
    console.log(`   ${domain}\n`);
    console.log('📝 Next steps:');
    console.log('1. Copy the URL above');
    console.log('2. Go to Render dashboard → Your backend service → Environment');
    console.log(`3. Add: ILO_CLUSTERING_API_URL=${domain}\n`);
  } catch (error) {
    console.log('⚠️  Could not get domain');
    console.log('Please check Railway dashboard for your service URL\n');
  }
  
  console.log('🎉 Deployment complete!\n');
}

// Run deployment
deploy().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});

