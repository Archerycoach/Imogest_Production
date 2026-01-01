#!/usr/bin/env node

/**
 * Google Calendar Configuration Checker
 * Verifies that all required environment variables are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Google Calendar Configuration...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.error('❌ ERROR: .env.local file not found!');
  console.log('\n📝 To fix this:');
  console.log('1. Copy .env.example to .env.local:');
  console.log('   cp .env.example .env.local');
  console.log('2. Fill in your Google Calendar credentials');
  console.log('3. Run this script again\n');
  process.exit(1);
}

console.log('✅ .env.local file exists\n');

// Read .env.local manually
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Check required variables
const requiredVars = {
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID': envVars['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': envVars['GOOGLE_CLIENT_SECRET'] || process.env.GOOGLE_CLIENT_SECRET,
  'GOOGLE_REDIRECT_URI': envVars['GOOGLE_REDIRECT_URI'] || process.env.GOOGLE_REDIRECT_URI,
};

let allConfigured = true;
let issues = [];

console.log('📋 Checking Environment Variables:\n');

for (const [varName, value] of Object.entries(requiredVars)) {
  if (!value || value.trim() === '' || value.includes('your_') || value.includes('example')) {
    console.log(`❌ ${varName}: NOT CONFIGURED`);
    allConfigured = false;
    issues.push(varName);
  } else {
    // Mask the value for security
    const maskedValue = value.length > 20 
      ? value.substring(0, 10) + '...' + value.substring(value.length - 5)
      : '***' + value.substring(value.length - 3);
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
}

console.log('\n');

if (!allConfigured) {
  console.error('❌ CONFIGURATION INCOMPLETE!\n');
  console.log('Missing or invalid variables:');
  issues.forEach(issue => console.log(`  - ${issue}`));
  console.log('\n📝 To fix this:\n');
  console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
  console.log('2. Create OAuth 2.0 Client ID (if not already created)');
  console.log('3. Copy Client ID and Client Secret');
  console.log('4. Add to .env.local:');
  console.log('   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com');
  console.log('   GOOGLE_CLIENT_SECRET=your_client_secret');
  console.log('   GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback');
  console.log('5. Restart your server: pm2 restart all\n');
  process.exit(1);
}

// Additional checks
console.log('🔍 Additional Checks:\n');

// Check Client ID format
const clientId = requiredVars['NEXT_PUBLIC_GOOGLE_CLIENT_ID'];
if (clientId && !clientId.endsWith('.apps.googleusercontent.com')) {
  console.log('⚠️  WARNING: Client ID should end with .apps.googleusercontent.com');
} else if (clientId) {
  console.log('✅ Client ID format looks correct');
}

// Check Client Secret format
const clientSecret = requiredVars['GOOGLE_CLIENT_SECRET'];
if (clientSecret && !clientSecret.startsWith('GOCSPX-')) {
  console.log('⚠️  WARNING: Client Secret should start with GOCSPX-');
} else if (clientSecret) {
  console.log('✅ Client Secret format looks correct');
}

// Check Redirect URI
const redirectUri = requiredVars['GOOGLE_REDIRECT_URI'];
if (redirectUri && !redirectUri.includes('/api/google-calendar/callback')) {
  console.log('⚠️  WARNING: Redirect URI should point to /api/google-calendar/callback');
} else if (redirectUri) {
  console.log('✅ Redirect URI looks correct');
}

console.log('\n✅ All Google Calendar credentials are configured!\n');
console.log('📝 Next steps:');
console.log('1. Make sure your server is running: pm2 restart all');
console.log('2. Test the configuration: http://localhost:3000/api/google-calendar/debug-oauth');
console.log('3. Try connecting: http://localhost:3000/api/google-calendar/auth\n');

process.exit(0);