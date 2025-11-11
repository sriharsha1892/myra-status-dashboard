#!/usr/bin/env node

/**
 * Generate password hash for user creation
 */

const bcrypt = require('bcryptjs');

const password = 'SriHarsha@2025!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  console.log('\n🔐 Password Hash Generated:\n');
  console.log(hash);
  console.log('\n');
});
