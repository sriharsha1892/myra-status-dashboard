#!/usr/bin/env node
/**
 * Groq Token Usage Monitor
 *
 * Monitors Groq API token usage and alerts if approaching limits
 * Run: node scripts/monitor-groq-usage.js
 * Or: npm run monitor:groq
 */

const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Dev Tier Limits (after upgrade)
const LIMITS = {
  TOKENS_PER_MINUTE: 30000,
  REQUESTS_PER_DAY: 14400,
  REQUESTS_PER_MINUTE: 30,
  // Conservative estimate for monthly token limit
  ESTIMATED_MONTHLY_TOKENS: 5000000, // 5M tokens (conservative)
};

// Alert thresholds
const ALERT_THRESHOLDS = {
  WARNING: 0.5,   // 50%
  CAUTION: 0.8,   // 80%
  CRITICAL: 0.9   // 90%
};

// Usage log file
const USAGE_LOG_FILE = path.join(__dirname, '../logs/groq-usage.json');

/**
 * Load usage history from log file
 */
function loadUsageHistory() {
  try {
    if (fs.existsSync(USAGE_LOG_FILE)) {
      const data = fs.readFileSync(USAGE_LOG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading usage history:', error.message);
  }
  return { calls: [], summary: {} };
}

/**
 * Calculate token usage from history
 */
function calculateUsage(history) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let tokensToday = 0;
  let tokensThisMonth = 0;
  let callsToday = 0;
  let callsThisMonth = 0;

  for (const call of history.calls || []) {
    const callDate = new Date(call.timestamp);

    if (callDate >= today) {
      tokensToday += call.tokens || 0;
      callsToday++;
    }

    if (callDate >= thisMonth) {
      tokensThisMonth += call.tokens || 0;
      callsThisMonth++;
    }
  }

  return {
    today: { tokens: tokensToday, calls: callsToday },
    month: { tokens: tokensThisMonth, calls: callsThisMonth }
  };
}

/**
 * Get alert level based on usage percentage
 */
function getAlertLevel(percentage) {
  if (percentage >= ALERT_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (percentage >= ALERT_THRESHOLDS.CAUTION) return 'CAUTION';
  if (percentage >= ALERT_THRESHOLDS.WARNING) return 'WARNING';
  return 'NORMAL';
}

/**
 * Format alert message with color
 */
function formatAlert(level, message) {
  const colors = {
    NORMAL: '\x1b[32m',   // Green
    WARNING: '\x1b[33m',  // Yellow
    CAUTION: '\x1b[35m',  // Magenta
    CRITICAL: '\x1b[31m'  // Red
  };
  const reset = '\x1b[0m';

  return `${colors[level]}[${level}]${reset} ${message}`;
}

/**
 * Display usage statistics
 */
function displayUsageStats() {
  console.log('\n' + '='.repeat(70));
  console.log('  GROQ API TOKEN USAGE MONITOR');
  console.log('='.repeat(70) + '\n');

  // Check API key
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ ERROR: GROQ_API_KEY not found in environment variables');
    console.error('   Please set GROQ_API_KEY in .env.local');
    process.exit(1);
  }

  console.log('✅ API Key: Configured');
  console.log('📊 Tier: Developer (30,000 TPM)\n');

  // Load usage history
  const history = loadUsageHistory();
  const usage = calculateUsage(history);

  // Display current usage
  console.log('─'.repeat(70));
  console.log('  TODAY\'S USAGE');
  console.log('─'.repeat(70));
  console.log(`Tokens used:        ${usage.today.tokens.toLocaleString()}`);
  console.log(`API calls:          ${usage.today.calls}`);
  console.log(`Avg tokens/call:    ${usage.today.calls > 0 ? Math.round(usage.today.tokens / usage.today.calls) : 0}`);
  console.log('');

  console.log('─'.repeat(70));
  console.log('  THIS MONTH\'S USAGE');
  console.log('─'.repeat(70));
  console.log(`Tokens used:        ${usage.month.tokens.toLocaleString()}`);
  console.log(`API calls:          ${usage.month.calls}`);
  console.log(`Avg tokens/call:    ${usage.month.calls > 0 ? Math.round(usage.month.tokens / usage.month.calls) : 0}`);

  const monthPercentage = (usage.month.tokens / LIMITS.ESTIMATED_MONTHLY_TOKENS) * 100;
  console.log(`Free tier usage:    ${monthPercentage.toFixed(2)}%`);

  const alertLevel = getAlertLevel(monthPercentage / 100);
  if (alertLevel !== 'NORMAL') {
    console.log('');
    console.log(formatAlert(alertLevel,
      `You've used ${monthPercentage.toFixed(1)}% of your estimated monthly free tier`
    ));
  }
  console.log('');

  // Rate limits
  console.log('─'.repeat(70));
  console.log('  RATE LIMITS (DEV TIER)');
  console.log('─'.repeat(70));
  console.log(`Tokens per minute:  ${LIMITS.TOKENS_PER_MINUTE.toLocaleString()} TPM`);
  console.log(`Requests per day:   ${LIMITS.REQUESTS_PER_DAY.toLocaleString()}`);
  console.log(`Requests per min:   ${LIMITS.REQUESTS_PER_MINUTE}`);
  console.log('');

  // Projections
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const projectedMonthlyUsage = (usage.month.tokens / dayOfMonth) * daysInMonth;

  console.log('─'.repeat(70));
  console.log('  PROJECTIONS');
  console.log('─'.repeat(70));
  console.log(`Projected monthly:  ${Math.round(projectedMonthlyUsage).toLocaleString()} tokens`);
  console.log(`Estimated cost:     $${((projectedMonthlyUsage * 0.0000002).toFixed(4))} (if over free tier)`);

  const projectedPercentage = (projectedMonthlyUsage / LIMITS.ESTIMATED_MONTHLY_TOKENS) * 100;
  console.log(`Projected usage:    ${projectedPercentage.toFixed(2)}% of free tier`);

  if (projectedPercentage > 100) {
    console.log('');
    console.log(formatAlert('WARNING',
      'Projected usage exceeds free tier. Consider optimizing prompts.'
    ));
  }
  console.log('');

  // Recommendations
  if (alertLevel === 'CRITICAL' || projectedPercentage > 100) {
    console.log('─'.repeat(70));
    console.log('  RECOMMENDATIONS');
    console.log('─'.repeat(70));
    console.log('• Review and optimize your prompts to reduce token usage');
    console.log('• Consider caching frequently requested data');
    console.log('• Implement request batching if applicable');
    console.log('• Monitor usage daily at: https://console.groq.com');
    console.log('');
  }

  // Expected usage
  console.log('─'.repeat(70));
  console.log('  YOUR EXPECTED USAGE (Based on 200 extractions/month)');
  console.log('─'.repeat(70));
  console.log(`Expected tokens:    240,000 tokens/month`);
  console.log(`Free tier limit:    ${LIMITS.ESTIMATED_MONTHLY_TOKENS.toLocaleString()} tokens (estimated)`);
  console.log(`Expected usage:     ${((240000 / LIMITS.ESTIMATED_MONTHLY_TOKENS) * 100).toFixed(2)}%`);
  console.log(`Status:             ${'✅ Well within limits'.padEnd(40)}`);
  console.log('');

  console.log('='.repeat(70));
  console.log('');
  console.log('💡 TIP: Run this script daily to monitor your usage');
  console.log('📊 Check detailed usage at: https://console.groq.com');
  console.log('');
}

// Run monitor
try {
  displayUsageStats();
} catch (error) {
  console.error('❌ Error monitoring Groq usage:', error.message);
  process.exit(1);
}
