/**
 * Debug script to understand the parsing structure
 */

import { parseSlashCommand } from '../lib/command/slashParser';

console.log('Testing slash command parsing structure:\n');

// Test a meeting command
const result1 = parseSlashCommand('/meeting @Acme demo 60min - discussed pricing');
console.log('=== /meeting @Acme demo 60min - discussed pricing ===');
console.log('Full result:', JSON.stringify(result1, null, 2));

// Test a deal note
const result2 = parseSlashCommand('/deal-note @TechCorp Budget approved');
console.log('\n=== /deal-note @TechCorp Budget approved ===');
console.log('Full result:', JSON.stringify(result2, null, 2));

// Test a champion
const result3 = parseSlashCommand('/champion @Acme bob@acme.com "Bob Wilson" CEO');
console.log('\n=== /champion @Acme bob@acme.com "Bob Wilson" CEO ===');
console.log('Full result:', JSON.stringify(result3, null, 2));

// Test a reminder
const result4 = parseSlashCommand('/remind @Acme "Send proposal" tomorrow high');
console.log('\n=== /remind @Acme "Send proposal" tomorrow high ===');
console.log('Full result:', JSON.stringify(result4, null, 2));

// Test an existing command that works
const result5 = parseSlashCommand('/note @Acme Great feedback');
console.log('\n=== /note @Acme Great feedback ===');
console.log('Full result:', JSON.stringify(result5, null, 2));
