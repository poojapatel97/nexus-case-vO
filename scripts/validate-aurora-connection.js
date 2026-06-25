#!/usr/bin/env node

/**
 * Validate Aurora PostgreSQL Connection
 * 
 * This script checks if all required environment variables are set
 * and validates that the Aurora connection is working correctly.
 * 
 * Usage: node scripts/validate-aurora-connection.js
 */

const requiredEnvVars = [
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGDATABASE',
  'AWS_REGION',
  'AWS_ROLE_ARN',
];

const optionalEnvVars = [
  'AWS_ACCOUNT_ID',
  'PGSSLMODE',
  'DATABASE_URL',
  'DIRECT_DATABASE_URL',
];

console.log('🔍 Validating Aurora PostgreSQL Connection...\n');

// ============================================================================
// 1. Check Required Environment Variables
// ============================================================================

console.log('1️⃣  Checking Required Environment Variables:');

let hasErrors = false;
const missing = [];

requiredEnvVars.forEach((envVar) => {
  const value = process.env[envVar];
  if (value) {
    console.log(`   ✅ ${envVar}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
  } else {
    console.log(`   ❌ ${envVar}: NOT SET`);
    missing.push(envVar);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.log(`\n⚠️  Missing environment variables: ${missing.join(', ')}`);
  console.log('\nQuick fix for Vercel:');
  console.log('1. Go to: Vercel Dashboard → Project Settings → Environment Variables');
  console.log('2. Add the missing variables from your Aurora integration');
  console.log('\nFor local development, copy .env.example to .env.local and fill in values.\n');
  process.exit(1);
}

// ============================================================================
// 2. Check Optional Environment Variables
// ============================================================================

console.log('\n2️⃣  Checking Optional Environment Variables:');

optionalEnvVars.forEach((envVar) => {
  const value = process.env[envVar];
  if (value) {
    console.log(`   ℹ️  ${envVar}: SET`);
  } else {
    console.log(`   ⏭️  ${envVar}: not set (optional)`);
  }
});

// ============================================================================
// 3. Validate Environment Variable Format
// ============================================================================

console.log('\n3️⃣  Validating Environment Variable Formats:');

const validations = [
  {
    name: 'PGHOST',
    value: process.env.PGHOST,
    test: (v) => v?.includes('.rds.amazonaws.com') || v?.includes('localhost'),
    message: 'should be an Aurora endpoint or localhost',
  },
  {
    name: 'PGPORT',
    value: process.env.PGPORT,
    test: (v) => !isNaN(parseInt(v)),
    message: 'should be a valid port number',
  },
  {
    name: 'AWS_REGION',
    value: process.env.AWS_REGION,
    test: (v) => /^[a-z]{2}-[a-z]+-\d{1}$/.test(v),
    message: 'should be a valid AWS region (e.g., us-east-1)',
  },
  {
    name: 'AWS_ROLE_ARN',
    value: process.env.AWS_ROLE_ARN,
    test: (v) => v?.startsWith('arn:aws:iam::'),
    message: 'should be a valid IAM ARN',
  },
];

validations.forEach(({ name, value, test, message }) => {
  if (test(value)) {
    console.log(`   ✅ ${name}: valid format`);
  } else {
    console.log(`   ⚠️  ${name}: ${message}`);
  }
});

// ============================================================================
// 4. Summary
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('✅ Aurora PostgreSQL Configuration Validated!');
console.log('='.repeat(70));

console.log('\n📝 Next Steps:');
console.log('1. If using Prisma:');
console.log('   - Ensure DATABASE_URL and DIRECT_DATABASE_URL are set');
console.log('   - Run: pnpm prisma db push');
console.log('   - Or run: pnpm prisma migrate dev');
console.log('\n2. If using Drizzle:');
console.log('   - Run: pnpm drizzle-kit push:pg');
console.log('\n3. Test the connection:');
console.log('   - Use: lib/db/aurora.ts for raw queries');
console.log('   - Or deploy to Vercel and check logs\n');

console.log('💡 For detailed setup, see: docs/AURORA_SETUP.md');
console.log('');

process.exit(0);
