# Database Migration Guide

This guide walks you through applying the database migrations for the parsing flow improvements.

## ⚠️ Important Notes

- These migrations must be applied in a specific order
- Run them during low-traffic hours if possible
- All migrations are designed to be safe and non-destructive
- Data cleanup happens before constraints are applied

## 📋 Migration Order

### Step 1: Data Cleanup (REQUIRED FIRST)
**File**: `supabase/migrations/00_fix_data_before_constraints.sql`

**Purpose**: Fixes existing data violations

**What it fixes**:
- Trial dates where end_date < start_date (swaps them)
- Negative values (contract_value, team_size, etc.)
- Empty titles in events, pain points, learnings
- Parse confidence values outside 0-1 range
- Invalid email formats

**To apply**:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `00_fix_data_before_constraints.sql`
3. Paste and Run
4. Check output - should show "SUCCESS: All data violations fixed!"

### Step 2: Atomic Transaction Function
**File**: `supabase/migrations/20251116_atomic_trial_org_creation.sql`

**Purpose**: Creates RPC function for atomic trial organization creation

**To apply**:
1. In Supabase SQL Editor
2. Copy contents of `20251116_atomic_trial_org_creation.sql`
3. Paste and Run

### Step 3: Data Validation Constraints
**File**: `supabase/migrations/20251116_add_data_constraints.sql`

**Purpose**: Adds database-level validation constraints

**To apply**:
1. In Supabase SQL Editor
2. Copy contents of `20251116_add_data_constraints.sql`
3. Paste and Run

## ✅ Done!

Your database is now upgraded with:
- Clean, valid data
- Atomic transaction support
- Database-level data validation
