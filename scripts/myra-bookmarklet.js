/**
 * myRA Usage Scraper Bookmarklet
 *
 * This bookmarklet scrapes usage data from the myRA admin panel
 * and sends it to the portal for review and import.
 *
 * Installation:
 * 1. Create a new bookmark in your browser
 * 2. Name it "Sync myRA Usage"
 * 3. Paste the minified code (below) as the URL
 * 4. Save the bookmark
 *
 * Usage:
 * 1. Go to https://www.ask-myra.ai/research/org-conversation
 * 2. Make sure you're logged in and can see the usage cards
 * 3. Click the bookmarklet
 * 4. Enter the date range when prompted
 * 5. Confirm the number of entries found
 * 6. The portal will open with the data for review
 *
 * Minified code for bookmark URL (copy everything below):
 * ---
 * javascript:(function(){if(!window.location.href.includes('ask-myra.ai')){alert('Please navigate to myRA admin first:\nhttps://www.ask-myra.ai/research/org-conversation');return;}var d=new Date(),w=new Date(d.getTime()-7*24*60*60*1000);var fromDate=prompt('From date (YYYY-MM-DD):',w.toISOString().split('T')[0]);if(!fromDate)return;var toDate=prompt('To date (YYYY-MM-DD):',d.toISOString().split('T')[0]);if(!toDate)return;var fromD=new Date(fromDate),toD=new Date(toDate);toD.setHours(23,59,59,999);var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];function findDateStart(t){for(var i=0;i<months.length;i++){var idx=t.indexOf(months[i]);if(idx>=0)return idx;}return -1;}function parseMyraDate(s){var m=s.match(/(\w+)\s+(\d+)/);if(!m)return null;var month=months.indexOf(m[1]),day=parseInt(m[2]),year=new Date().getFullYear();var t=s.match(/(\d+):(\d+)\s*(AM|PM)/i);var hour=0,min=0;if(t){hour=parseInt(t[1]);min=parseInt(t[2]);if(t[3].toUpperCase()==='PM'&&hour!==12)hour+=12;if(t[3].toUpperCase()==='AM'&&hour===12)hour=0;}return new Date(year,month,day,hour,min);}var entries=[],seen={};var allButtons=document.querySelectorAll('button');allButtons.forEach(function(btn){var btnText=btn.textContent?.trim()||'';if(btnText.length<3||btnText==='myRA AI'||btnText.includes('All ')||btnText==='API')return;var container=btn.parentElement?.parentElement;if(!container)return;var children=Array.from(container.children||[]);if(children.length<2)return;var secondDiv=children[1];var secondText=secondDiv?.textContent||'';if(!secondText.includes('$'))return;var dollarIdx=secondText.lastIndexOf('$');var cost=dollarIdx>=0?secondText.substring(dollarIdx):null;if(!cost)return;var dateStart=findDateStart(secondText);if(dateStart<0)return;var user=secondText.substring(0,dateStart).trim()||'Unknown';var dateAndCost=secondText.substring(dateStart);var dateMatch=dateAndCost.match(/^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^$]+(?:AM|PM))/i);var date=dateMatch?dateMatch[1]:null;if(!date)return;var entryDate=parseMyraDate(date);if(!entryDate||entryDate<fromD||entryDate>toD)return;var key=btnText+date+cost;if(seen[key])return;seen[key]=true;entries.push({title:btnText,user:user,date:date,cost:cost});});if(entries.length===0){alert('No entries found in date range: '+fromDate+' to '+toDate+'\n\nFound '+allButtons.length+' buttons on page.\n\nTry:\n1. Scroll to load more entries\n2. Adjust date range\n3. Make sure you are on All Chats page');return;}if(confirm('Found '+entries.length+' entries from '+fromDate+' to '+toDate+'.\n\nClick OK to open the portal and review.')){var data=btoa(unescape(encodeURIComponent(JSON.stringify(entries))));window.open('https://myra-status-dashboard.vercel.app/quote/admin?tab=reporting&sync=myra&data='+data,'_blank');}})();
 * ---
 */

// Full readable version of the bookmarklet
(function () {
  // Verify we're on the right page
  if (!window.location.href.includes('ask-myra.ai')) {
    alert(
      'Please navigate to myRA admin first:\nhttps://www.ask-myra.ai/research/org-conversation'
    );
    return;
  }

  // Date range prompt with defaults (last 7 days)
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const fromDate = prompt(
    'From date (YYYY-MM-DD):',
    weekAgo.toISOString().split('T')[0]
  );
  if (!fromDate) return;

  const toDate = prompt('To date (YYYY-MM-DD):', today.toISOString().split('T')[0]);
  if (!toDate) return;

  const fromD = new Date(fromDate);
  const toD = new Date(toDate);
  toD.setHours(23, 59, 59, 999); // Include full end date

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Find where a month name starts in text
  function findDateStart(text) {
    for (const month of months) {
      const idx = text.indexOf(month);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  // Parse myRA date format like "Jan 24, Sat, 01:00 AM"
  function parseMyraDate(dateStr) {
    const match = dateStr.match(/(\w+)\s+(\d+)/);
    if (!match) return null;

    const month = months.indexOf(match[1]);
    const day = parseInt(match[2]);
    const year = new Date().getFullYear();

    // Parse time
    const timeMatch = dateStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let hour = 0,
      minute = 0;
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = parseInt(timeMatch[2]);
      if (timeMatch[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (timeMatch[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
    }

    return new Date(year, month, day, hour, minute);
  }

  // Scrape conversation cards
  const entries = [];
  const seen = {};

  const allButtons = document.querySelectorAll('button');

  allButtons.forEach((btn) => {
    const btnText = btn.textContent?.trim() || '';

    // Skip navigation/filter buttons
    if (btnText.length < 3 || btnText === 'myRA AI' || btnText.includes('All ') || btnText === 'API') {
      return;
    }

    // Get card container (2 levels up)
    const container = btn.parentElement?.parentElement;
    if (!container) return;

    // Card has 2 child divs: first has title+agent, second has user+date+cost
    const children = Array.from(container.children || []);
    if (children.length < 2) return;

    const secondDiv = children[1];
    const secondText = secondDiv?.textContent || '';

    // Must have cost
    if (!secondText.includes('$')) return;

    // Extract cost (at the end)
    const dollarIdx = secondText.lastIndexOf('$');
    const cost = dollarIdx >= 0 ? secondText.substring(dollarIdx) : null;
    if (!cost) return;

    // Find where date starts
    const dateStart = findDateStart(secondText);
    if (dateStart < 0) return;

    // User is text before date
    const user = secondText.substring(0, dateStart).trim() || 'Unknown';

    // Date is from dateStart to cost
    const dateAndCost = secondText.substring(dateStart);
    const dateMatch = dateAndCost.match(/^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^$]+(?:AM|PM))/i);
    const date = dateMatch ? dateMatch[1] : null;
    if (!date) return;

    // Filter by date range
    const entryDate = parseMyraDate(date);
    if (!entryDate || entryDate < fromD || entryDate > toD) return;

    // Dedupe
    const key = btnText + date + cost;
    if (seen[key]) return;
    seen[key] = true;

    entries.push({
      title: btnText,
      user: user,
      date: date,
      cost: cost,
    });
  });

  // Handle results
  if (entries.length === 0) {
    alert(
      `No entries found in date range: ${fromDate} to ${toDate}\n\n` +
      `Found ${allButtons.length} buttons on page.\n\n` +
      `Try:\n` +
      `1. Scroll to load more entries\n` +
      `2. Adjust date range\n` +
      `3. Make sure you are on All Chats page`
    );
    return;
  }

  // Confirm and open portal
  if (
    confirm(
      `Found ${entries.length} entries from ${fromDate} to ${toDate}.\n\nClick OK to open the portal and review.`
    )
  ) {
    // Encode data as base64
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(entries))));
    const url = `https://myra-status-dashboard.vercel.app/quote/admin?tab=reporting&sync=myra&data=${data}`;

    window.open(url, '_blank');
  }
})();
