#!/usr/bin/env node

/**
 * Quick Backend Startup Test
 * Tests if the server can start without errors
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

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

async function testServerStartup() {
  log('🧪 Testing CA2AChain Backend Startup...', 'blue');
  
  // Check if we have the required files
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const requiredFiles = [
      'src/index.ts',
      'src/services/supabase.ts',
      'src/routes/auth.ts',
      'package.json'
    ];
    
    log('\n1. Checking required files...', 'yellow');
    for (const file of requiredFiles) {
      const exists = fs.existsSync(file);
      log(`   ${exists ? '✅' : '❌'} ${file}`, exists ? 'green' : 'red');
      if (!exists) {
        log(`\n❌ Missing required file: ${file}`, 'red');
        return false;
      }
    }
    
    log('\n2. Checking package.json...', 'yellow');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasStartScript = packageJson.scripts?.start || packageJson.scripts?.dev;
    log(`   ${hasStartScript ? '✅' : '❌'} Start script available`, hasStartScript ? 'green' : 'red');
    
    if (!hasStartScript) {
      log('\n💡 Add this to package.json scripts:', 'yellow');
      log('   "dev": "tsx watch src/index.ts"', 'blue');
      log('   "start": "node dist/index.js"', 'blue');
      return false;
    }
    
    log('\n3. Testing TypeScript compilation...', 'yellow');
    try {
      // Try to import the main index file to check for syntax errors
      const { execSync } = await import('child_process');
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      log('   ✅ TypeScript compilation successful', 'green');
    } catch (error) {
      log('   ❌ TypeScript compilation failed', 'red');
      log(`   Error: ${error.message}`, 'red');
      return false;
    }
    
    log('\n✅ Backend files and configuration look good!', 'green');
    log('\n📋 Next steps to run the backend:', 'blue');
    log('   1. Make sure environment variables are set:', 'blue');
    log('      - SUPABASE_URL', 'blue');
    log('      - SUPABASE_SERVICE_ROLE_KEY', 'blue');
    log('      - STRIPE_SECRET_KEY', 'blue');
    log('      - RESEND_API_KEY', 'blue');
    log('      - ENCRYPTION_KEY', 'blue');
    log('      - FRONTEND_URL', 'blue');
    log('\n   2. Run the migration in Supabase:', 'blue');
    log('      - Execute 20250101000000_ca2achain_complete_schema.sql', 'blue');
    log('\n   3. Start the server:', 'blue');
    log('      - npm run dev  (for development)', 'blue');
    log('      - npm start   (for production)', 'blue');
    
    return true;
    
  } catch (error) {
    log(`\n❌ Startup test failed: ${error.message}`, 'red');
    return false;
  }
}

// Run the test
testServerStartup().then(success => {
  if (success) {
    log('\n🎉 Backend is ready to start!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Please fix the issues above before starting the backend.', 'yellow');
    process.exit(1);
  }
});