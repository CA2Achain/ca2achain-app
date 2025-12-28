#!/usr/bin/env node

/**
 * CA2AChain Backend Test Runner
 * Simple script to run all backend tests
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

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

async function runTests() {
  log('🧪 CA2AChain Backend Test Runner', 'blue');
  log('====================================', 'blue');

  // Check if we're in the right directory
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    if (packageJson.name !== 'ca2achain-backend') {
      log('❌ Please run this from the backend directory', 'red');
      process.exit(1);
    }
  } catch (err) {
    log('❌ No package.json found. Are you in the backend directory?', 'red');
    process.exit(1);
  }

  // Run startup test
  log('\n1️⃣ Running startup test...', 'yellow');
  try {
    execSync('node test/startup-test.js', { stdio: 'inherit' });
    log('✅ Startup test passed!', 'green');
  } catch (err) {
    log('❌ Startup test failed!', 'red');
    process.exit(1);
  }

  // Check if server is running for full tests
  log('\n2️⃣ Checking if backend server is running...', 'yellow');
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3001/health', { 
      signal: AbortSignal.timeout(5000) 
    });
    if (response.ok) {
      log('✅ Backend server is running!', 'green');
      
      // Run full test suite
      log('\n3️⃣ Running full test suite...', 'yellow');
      try {
        execSync('node test/test-backend.js', { stdio: 'inherit' });
        log('\n🎉 All tests completed!', 'green');
      } catch (err) {
        log('\n❌ Some tests failed. Check the output above.', 'red');
        process.exit(1);
      }
    } else {
      throw new Error('Server not responding');
    }
  } catch (err) {
    log('⚠️  Backend server is not running', 'yellow');
    log('\n💡 To run full tests:', 'blue');
    log('   1. Start the backend: npm run dev', 'blue');
    log('   2. Run tests: node test/test-backend.js', 'blue');
    log('\n✅ Startup tests passed - backend is ready to start!', 'green');
  }
}

runTests().catch(console.error);