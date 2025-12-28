#!/usr/bin/env node

/**
 * CA2AChain Backend Development Setup
 * Quick setup script for local development
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupDevelopment() {
  log('🛠️  CA2AChain Backend Development Setup', 'blue');
  log('=========================================', 'blue');

  // 1. Check package.json
  log('\n1️⃣ Checking package.json...', 'yellow');
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    log(`✅ Found ${packageJson.name} v${packageJson.version}`, 'green');
  } catch (err) {
    log('❌ No package.json found. Are you in the backend directory?', 'red');
    process.exit(1);
  }

  // 2. Install dependencies
  log('\n2️⃣ Installing dependencies...', 'yellow');
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Dependencies installed!', 'green');
  } catch (err) {
    log('❌ Failed to install dependencies', 'red');
    process.exit(1);
  }

  // 3. Create .env file if it doesn't exist
  log('\n3️⃣ Setting up environment file...', 'yellow');
  if (!existsSync('.env')) {
    try {
      let envTemplate = readFileSync('.env.example', 'utf8');
      
      // Generate encryption key
      const encryptionKey = randomBytes(32).toString('hex');
      envTemplate = envTemplate.replace(
        'ENCRYPTION_KEY=your-64-character-hex-encryption-key-here-32-bytes-total',
        `ENCRYPTION_KEY=${encryptionKey}`
      );
      
      writeFileSync('.env', envTemplate);
      log('✅ Created .env file with generated encryption key', 'green');
      log('⚠️  You still need to add your API keys (Supabase, Stripe, etc.)', 'yellow');
    } catch (err) {
      log('❌ Failed to create .env file', 'red');
      log('💡 Copy .env.example to .env manually', 'blue');
    }
  } else {
    log('✅ .env file already exists', 'green');
  }

  // 4. Run startup test
  log('\n4️⃣ Running startup test...', 'yellow');
  try {
    execSync('node test/startup-test.js', { stdio: 'inherit' });
  } catch (err) {
    log('⚠️  Startup test failed - you may need to configure your .env file', 'yellow');
  }

  // 5. Show next steps
  log('\n🎯 Next Steps:', 'blue');
  log('=============', 'blue');
  log('1. Edit .env file with your actual API keys:', 'blue');
  log('   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY', 'blue');
  log('   - STRIPE_SECRET_KEY (for payments)', 'blue');
  log('   - RESEND_API_KEY (for emails)', 'blue');
  log('   - PERSONA_API_KEY (for identity verification)', 'blue');
  log('', 'blue');
  log('2. Set up your Supabase database:', 'blue');
  log('   - Run the migration file in your Supabase SQL editor', 'blue');
  log('   - File: supabase/migrations/20250101000000_ca2achain_complete_schema.sql', 'blue');
  log('', 'blue');
  log('3. Start the development server:', 'blue');
  log('   npm run dev', 'green');
  log('', 'blue');
  log('4. Run tests (in another terminal):', 'blue');
  log('   npm run test', 'green');
  log('', 'blue');
  log('📚 See test/TESTING.md for detailed setup instructions', 'blue');
  
  log('\n✅ Development setup complete!', 'green');
}

setupDevelopment().catch(console.error);