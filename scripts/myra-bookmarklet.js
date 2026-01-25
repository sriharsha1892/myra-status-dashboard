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
 * javascript:(function(){if(!window.location.href.includes('ask-myra.ai')){alert('Please navigate to myRA admin first:\nhttps://www.ask-myra.ai/research/org-conversation');return;}var d=new Date(),w=new Date(d.getTime()-7*24*60*60*1000);var fromDate=prompt('From date (YYYY-MM-DD):',w.toISOString().split('T')[0]);if(!fromDate)return;var toDate=prompt('To date (YYYY-MM-DD):',d.toISOString().split('T')[0]);if(!toDate)return;var fromD=new Date(fromDate),toD=new Date(toDate);toD.setHours(23,59,59,999);function parseMyraDate(s){var months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};var m=s.match(/(\w+)\s+(\d+)/);if(!m)return null;var month=months[m[1]],day=parseInt(m[2]),year=new Date().getFullYear();var t=s.match(/(\d+):(\d+)\s*(AM|PM)/i);var hour=0,min=0;if(t){hour=parseInt(t[1]);min=parseInt(t[2]);if(t[3].toUpperCase()==='PM'&&hour!==12)hour+=12;if(t[3].toUpperCase()==='AM'&&hour===12)hour=0;}return new Date(year,month,day,hour,min);}var entries=[];var allElements=document.querySelectorAll('button, [role="button"], div[class*="card"], div[class*="conversation"], div[class*="chat"], div[class*="item"]');allElements.forEach(function(el){var text=el.textContent||'';if(!text.includes('$'))return;var costMatch=text.match(/\$\d+\.?\d*/);if(!costMatch)return;var dateMatch=text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}[^$]*(AM|PM)/i);if(!dateMatch)return;var lines=text.split(/\n/).map(function(l){return l.trim();}).filter(function(l){return l.length>0&&l.length<100;});var title='',user='',dateStr='',cost=costMatch[0];for(var i=0;i<lines.length;i++){var l=lines[i];if(l.match(/^\$\d/))continue;if(l.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/i)){dateStr=l;}else if(l==='myRA AI'||l.match(/^(Agent|Project):/i))continue;else if(!title&&l.length>2&&l.length<80){title=l;}else if(!user&&l.length>2&&l.length<50&&!l.match(/^(Agent|Project|myRA)/i)){user=l;}}if(dateStr&&cost){var entryDate=parseMyraDate(dateStr);if(entryDate&&entryDate>=fromD&&entryDate<=toD){entries.push({title:title||'Untitled',user:user||'Unknown',date:dateStr,cost:cost});}}});entries=entries.filter(function(e,i,arr){return arr.findIndex(function(x){return x.title===e.title&&x.date===e.date&&x.cost===e.cost;})===i;});if(entries.length===0){alert('No entries found in date range: '+fromDate+' to '+toDate+'\n\nDebug info:\n- Elements scanned: '+allElements.length+'\n- Elements with $: '+Array.from(allElements).filter(function(e){return(e.textContent||'').includes('$');}).length+'\n\nTry:\n1. Scroll down to load more entries\n2. Adjust date range\n3. Make sure cards are visible');return;}if(confirm('Found '+entries.length+' entries from '+fromDate+' to '+toDate+'.\n\nClick OK to open the portal and review.')){var data=btoa(unescape(encodeURIComponent(JSON.stringify(entries))));window.open('https://myra-status-dashboard.vercel.app/quote/admin?tab=reporting&sync=myra&data='+data,'_blank');}})();
 * ---
 */

// Full readable version of the bookmarklet
(function () {
  // Verify we're on the right page (relaxed check - just needs to be on ask-myra.ai)
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

  // Parse myRA date format like "Jan 24, Sat, 01:00 AM"
  function parseMyraDate(dateStr) {
    const months = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };

    const match = dateStr.match(/(\w+)\s+(\d+)/);
    if (!match) return null;

    const month = months[match[1]];
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

  // Scrape all potential conversation cards using multiple selectors
  const entries = [];

  // Try multiple selectors to find conversation cards
  const allElements = document.querySelectorAll(
    'button, [role="button"], div[class*="card"], div[class*="conversation"], div[class*="chat"], div[class*="item"]'
  );

  allElements.forEach((el) => {
    const text = el.textContent || '';

    // Must contain a cost indicator
    if (!text.includes('$')) return;

    // Look for cost pattern
    const costMatch = text.match(/\$\d+\.?\d*/);
    if (!costMatch) return;

    // Look for date pattern
    const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}[^$]*(AM|PM)/i);
    if (!dateMatch) return;

    // Parse the text content
    const lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0 && l.length < 100);

    let title = '';
    let user = '';
    let dateStr = '';
    let cost = costMatch[0];

    for (const line of lines) {
      // Skip cost lines (already captured)
      if (line.match(/^\$\d/)) continue;

      // Capture date line
      if (line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/i)) {
        dateStr = line;
      } else if (line === 'myRA AI' || line.match(/^(Agent|Project):/i)) {
        // Skip agent/project labels
        continue;
      } else if (!title && line.length > 2 && line.length < 80) {
        title = line;
      } else if (!user && line.length > 2 && line.length < 50 && !line.match(/^(Agent|Project|myRA)/i)) {
        user = line;
      }
    }

    // Only add if we have the essential fields
    if (dateStr && cost) {
      const entryDate = parseMyraDate(dateStr);

      // Filter by date range
      if (entryDate && entryDate >= fromD && entryDate <= toD) {
        entries.push({
          title: title || 'Untitled Conversation',
          user: user || 'Unknown',
          date: dateStr,
          cost: cost,
        });
      }
    }
  });

  // Deduplicate entries (nested elements may cause duplicates)
  const uniqueEntries = entries.filter((entry, index, self) =>
    self.findIndex(e => e.title === entry.title && e.date === entry.date && e.cost === entry.cost) === index
  );

  // Handle results
  if (uniqueEntries.length === 0) {
    alert(
      `No entries found in date range: ${fromDate} to ${toDate}\n\n` +
      `Debug info:\n` +
      `- Elements scanned: ${allElements.length}\n` +
      `- Elements with $: ${Array.from(allElements).filter(e => (e.textContent || '').includes('$')).length}\n\n` +
      `Try:\n` +
      `1. Scroll down to load more entries\n` +
      `2. Adjust date range\n` +
      `3. Make sure cards are visible`
    );
    return;
  }

  // Confirm and open portal
  if (
    confirm(
      `Found ${uniqueEntries.length} entries from ${fromDate} to ${toDate}.\n\nClick OK to open the portal and review.`
    )
  ) {
    // Encode data as base64
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(uniqueEntries))));
    const url = `https://myra-status-dashboard.vercel.app/quote/admin?tab=reporting&sync=myra&data=${data}`;

    window.open(url, '_blank');
  }
})();
