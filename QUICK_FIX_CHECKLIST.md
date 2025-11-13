# Quick Fix Checklist - Gemini API Quota Issue

**Time Required:** 5-10 minutes
**Status:** CRITICAL for tomorrow's demo

---

## Step-by-Step Fix (Copy & Paste Ready)

### Step 1: Generate New API Key
1. Open: https://aistudio.google.com/app/apikey
2. Delete old key: `AIzaSyA9YPI7bkE4J6T-yX1eFGb252uTPAKJA6s`
3. Click "Create API Key"
4. Copy the new key to your clipboard

---

### Step 2: Update Local Environment
```bash
# Navigate to project directory
cd /Users/sriharsha/myra-status-dashboard

# Edit .env.local (replace YOUR_NEW_KEY_HERE with actual key)
# Find line 61: GEMINI_API_KEY=AIzaSyA9YPI7bkE4J6T-yX1eFGb252uTPAKJA6s
# Replace with: GEMINI_API_KEY=YOUR_NEW_KEY_HERE
```

**OR use this one-liner (Mac/Linux):**
```bash
# Replace YOUR_NEW_KEY_HERE with your actual new key
sed -i '' 's/GEMINI_API_KEY=.*/GEMINI_API_KEY=YOUR_NEW_KEY_HERE/' .env.local
```

---

### Step 3: Test New Key
```bash
# Test the new API key (replace YOUR_NEW_KEY_HERE)
GEMINI_API_KEY="YOUR_NEW_KEY_HERE" node scripts/diagnose-gemini-api.js
```

**Expected output:**
```
✅ API Key is valid!
Found 50 available models
✅ gemini-2.5-flash WORKS!
Response: OK
```

**If you see this, you're good! Proceed to Step 4.**

---

### Step 4: Update Vercel Environment
1. Open: https://vercel.com/[your-project]/settings/environment-variables
2. Find: `GEMINI_API_KEY`
3. Click "Edit"
4. Paste your new API key
5. Select all environments (Production, Preview, Development)
6. Click "Save"
7. Trigger redeploy:
   - Go to: Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

---

### Step 5: Restart Dev Server
```bash
# Kill existing dev server (Ctrl+C if running)
# OR find and kill it:
pkill -f "next dev"

# Start fresh
npm run dev
```

---

### Step 6: Verify in Browser
1. Open: http://localhost:3000/support/trials
2. Click any trial organization (e.g., BP-Castrol)
3. Click "Timeline" tab
4. Click "Bulk Import" button
5. Paste this test text:
   ```
   Call on Oct 28 - client liked the platform, will test during Nov 17-21 window. Follow up scheduled for Nov 14.
   ```
6. Click "Parse with AI"
7. **Should see:** 2-3 extracted events with confidence scores

**✅ If you see extracted events → YOU'RE DONE!**
**❌ If you see errors → Check steps above or run diagnostic again**

---

## Quick Verification Commands

```bash
# Check if API key is in .env.local
grep GEMINI_API_KEY .env.local

# Test API key directly
GEMINI_API_KEY="your_key" node scripts/diagnose-gemini-api.js

# Check dev server is running
lsof -ti:3000

# Restart dev server if needed
pkill -f "next dev" && npm run dev
```

---

## Troubleshooting

### Issue: New key still shows quota error
**Solution:** Wait 1-2 minutes for Google's systems to provision the new key, then try again.

### Issue: Can't see Bulk Import button
**Solution:** Make sure you're on the Timeline tab of a trial organization page.

### Issue: "Parse with AI" returns 500 error
**Solution:**
1. Check browser console for errors
2. Check terminal/dev server logs
3. Verify API key is correct in .env.local
4. Restart dev server

### Issue: Vercel deployment not picking up new key
**Solution:**
1. Verify you saved the environment variable
2. Make sure you selected all environments
3. Trigger manual redeploy
4. Wait 2-3 minutes for build to complete

---

## Success Criteria

✅ Diagnostic script shows "✅ [model] WORKS!"
✅ Dev server running without errors
✅ Can access Timeline tab in browser
✅ Bulk Import button visible
✅ "Parse with AI" extracts events successfully
✅ Confidence scores displayed (High/Medium/Low)
✅ Can import selected events

---

## Emergency Fallback

If you can't get the new key working in time:

**Demo Plan B:**
1. Show the UI and explain the feature
2. Use Quick Entry form to add events manually
3. Say: "The AI parsing feature requires API quota refresh, but let me show you how it looks..."
4. Walk through the 3-stage workflow visually
5. Emphasize: "This would normally parse 10+ events in 5-10 seconds"

**The UI is beautiful and fully functional, just the AI backend needs the quota.**

---

## Time Estimates

| Task | Time |
|------|------|
| Generate new API key | 2 min |
| Update .env.local | 1 min |
| Test with diagnostic | 2 min |
| Update Vercel env vars | 3 min |
| Restart & verify | 3 min |
| **TOTAL** | **11 min** |

---

## Next Steps After Fix

Once working:
1. ✅ Mark as resolved in your notes
2. ✅ Test with real example narratives
3. ✅ Prepare demo script (see TEST_RESULTS_TIMELINE_IMPORT.md)
4. ✅ Sleep well knowing demo is ready!

---

**Need help?** Run: `node scripts/diagnose-gemini-api.js`

**Full details:** See `GEMINI_API_QUOTA_ISSUE.md`

---

*Created: November 13, 2024*
*For: Tomorrow's onboarding demo*
*Priority: CRITICAL*
