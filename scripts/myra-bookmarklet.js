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
 * javascript:(function(){if(!window.location.href.includes('ask-myra.ai/research/org-conversation')){alert('Please navigate to All Chats page first:\nhttps://www.ask-myra.ai/research/org-conversation');return;}var d=new Date(),w=new Date(d.getTime()-7*24*60*60*1000);var fromDate=prompt('From date (YYYY-MM-DD):',w.toISOString().split('T')[0]);if(!fromDate)return;var toDate=prompt('To date (YYYY-MM-DD):',d.toISOString().split('T')[0]);if(!toDate)return;var fromD=new Date(fromDate),toD=new Date(toDate);toD.setHours(23,59,59,999);function parseMyraDate(s){var months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};var m=s.match(/(\w+)\s+(\d+)/);if(!m)return null;var month=months[m[1]],day=parseInt(m[2]),year=new Date().getFullYear();var t=s.match(/(\d+):(\d+)\s*(AM|PM)/i);var hour=0,min=0;if(t){hour=parseInt(t[1]);min=parseInt(t[2]);if(t[3].toUpperCase()==='PM'&&hour!==12)hour+=12;if(t[3].toUpperCase()==='AM'&&hour===12)hour=0;}return new Date(year,month,day,hour,min);}var entries=[];document.querySelectorAll('button').forEach(function(btn){var text=btn.textContent||'';if(!text.includes('myRA AI')&&!text.includes('$'))return;var lines=text.split(/\n/).map(function(l){return l.trim();}).filter(Boolean);var title='',user='',dateStr='',cost='';for(var i=0;i<lines.length;i++){var l=lines[i];if(l.startsWith('$')){cost=l;}else if(l.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/)){dateStr=l;}else if(l==='myRA AI'||l.startsWith('Agent:')||l.startsWith('Project:')){}else if(!title){title=l;}else if(!user){user=l;}}if(dateStr&&cost){var entryDate=parseMyraDate(dateStr);if(entryDate&&entryDate>=fromD&&entryDate<=toD){entries.push({title:title||'Untitled',user:user||'Unknown',date:dateStr,cost:cost});}}});if(entries.length===0){alert('No entries found in the selected date range.\nNote: Only entries visible on the current page are scraped.\nTry adjusting the date range or scrolling to load more entries.');return;}if(confirm('Found '+entries.length+' entries.\n\nClick OK to open the portal and review the data.')){var data=btoa(unescape(encodeURIComponent(JSON.stringify(entries))));window.open('https://myra-status-dashboard.vercel.app/quote/admin?tab=reporting&sync=myra&data='+data,'_blank');}})();
 * ---
 */

// Full readable version of the bookmarklet
(function () {
  // Verify we're on the right page
  if (!window.location.href.includes('ask-myra.ai/research/org-conversation')) {
    alert(
      'Please navigate to All Chats page first:\nhttps://www.ask-myra.ai/research/org-conversation'
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

  // Scrape all conversation cards
  const entries = [];

  document.querySelectorAll('button').forEach((btn) => {
    const text = btn.textContent || '';

    // Skip buttons that don't look like conversation cards
    if (!text.includes('myRA AI') && !text.includes('$')) return;

    // Parse the text content
    const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

    let title = '';
    let user = '';
    let dateStr = '';
    let cost = '';

    for (const line of lines) {
      if (line.startsWith('$')) {
        cost = line;
      } else if (line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/)) {
        dateStr = line;
      } else if (line === 'myRA AI' || line.startsWith('Agent:') || line.startsWith('Project:')) {
        // Skip agent/project labels
      } else if (!title) {
        title = line;
      } else if (!user) {
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

  // Handle results
  if (entries.length === 0) {
    alert(
      'No entries found in the selected date range.\n\n' +
        'Note: Only entries visible on the current page are scraped.\n' +
        'Try adjusting the date range or scrolling to load more entries.'
    );
    return;
  }

  // Confirm and open portal
  if (
    confirm(
      `Found ${entries.length} entries.\n\nClick OK to open the portal and review the data.`
    )
  ) {
    // Encode data as base64
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(entries))));
    const url = `https://myra-status-dashboard.vercel.app/quote/admin?tab=reporting&sync=myra&data=${data}`;

    window.open(url, '_blank');
  }
})();
