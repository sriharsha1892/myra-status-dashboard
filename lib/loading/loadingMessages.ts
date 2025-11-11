import { LoadingContext, LoadingSubContext } from './types';

/**
 * Loading messages organized by context and sub-context
 * Personality: Unconventional, self-deprecating, harmless
 */

type MessageLibrary = Record<LoadingContext, {
  default: string[];
  [key: string]: string[];
}>;

export const loadingMessages: MessageLibrary = {
  // Page loading messages
  page: {
    default: [
      "Pretending to work harder than we actually are...",
      "Loading... because instant gratification takes time...",
      "Making the hamsters run faster on their wheels...",
      "Doing that thing computers do when you wait...",
      "Almost there (we say that a lot)...",
      "Loading with 87% confidence (we think)...",
      "Please wait while we wait...",
      "Processing... or procrastinating... hard to tell...",
    ],
    reports: [
      "Assembling insights like IKEA furniture (missing pieces optional)...",
      "Reading between the lines (and the columns)...",
      "Reports incoming... probably... hopefully...",
      "Still faster than your last Zoom call loaded...",
      "Crunching numbers (they're surprisingly crunchy)...",
      "Brewing fresh reports (decaf, sorry)...",
      "Teaching charts to tell better stories...",
      "Generating insights... insightfully...",
    ],
    dashboard: [
      "Warming up your command center...",
      "Polishing those KPIs (they're very shiny)...",
      "Dashboard loading at dashboard speeds...",
      "Assembling the metrics dream team...",
      "Your data is fashionably late...",
      "Loading faster than we look...",
    ],
    trials: [
      "Gathering trial wisdom from the cosmos...",
      "Your trials are loading (emotionally and literally)...",
      "Pipeline materializing...",
      "Checking which trials are winning hearts...",
      "Trial data incoming (it's very trial-y)...",
    ],
    roadmap: [
      "Plotting the future (no crystal ball needed)...",
      "Roadmap loading... taking the scenic route...",
      "Features incoming (they're feature-ful)...",
      "Building tomorrow, today... eventually...",
    ],
    tickets: [
      "Summoning support tickets from the void...",
      "Tickets loading (hopefully not yours)...",
      "Organizing chaos... sort of...",
      "Support tickets incoming... brace yourself...",
    ],
  },

  // Chart loading messages
  chart: {
    default: [
      "Charts are shy, give them a moment...",
      "Waiting for the graphs to get their act together...",
      "Charts loading at chart speed...",
      "Drawing with invisible ink first (for practice)...",
      "Your data called in sick, we're using a stand-in...",
      "Asking the charts nicely to render...",
      "Visualizations visualizing...",
    ],
    lineChart: [
      "Lines connecting dots (it's harder than it looks)...",
      "Drawing lines between data points...",
      "Time series are timey-wimey but we got this...",
      "Plotting your success trajectory... ish...",
    ],
    barChart: [
      "Asking the bars to stand up straight...",
      "Bars loading (the data kind, not the fun kind)...",
      "Teaching bars to behave...",
      "Bar chart incoming (still no free drinks)...",
    ],
    pieChart: [
      "Teaching pie charts to share nicely...",
      "Slicing up the data pie...",
      "Making sure every slice counts...",
      "Calculating delicious percentages...",
      "Pie chart loading (not edible, sorry)...",
    ],
    areaChart: [
      "Filling in the areas... area-ly...",
      "Stacking data like pancakes...",
      "Area charts taking shape...",
      "Coloring between the lines...",
    ],
    sankey: [
      "Flow diagrams flowing...",
      "Mapping the journey of a thousand trials...",
      "Connecting the conversion dots...",
      "Following the data streams...",
      "Flow chart loading (very flowy)...",
    ],
  },

  // Data fetching messages
  data: {
    default: [
      "Convincing the database to cooperate...",
      "Bribing the server with compliments...",
      "Asking nicely for your data...",
      "Fetching data (it doesn't fetch well)...",
      "Data wrangling in progress...",
      "Teaching old data new tricks...",
      "Rounding up data like herding cats...",
      "Database thinking... very deeply...",
    ],
    organizations: [
      "Your organizations are playing hide and seek...",
      "Rounding up all your organizations...",
      "Organizations incoming... organizationally...",
      "Fetching org data (org-anizing it first)...",
      "Portfolio loading... professionally...",
    ],
    users: [
      "Users loading... use-fully...",
      "Counting users (they're very countable)...",
      "Assembling the user roster...",
      "User data incoming (they said hi)...",
    ],
    analytics: [
      "Mining insights from engagement gold...",
      "Running the analytics gauntlet...",
      "Converting raw data into wisdom... ish...",
      "Analytics thinking... analytically...",
      "Crunching metrics (crunch crunch)...",
    ],
    tickets_data: [
      "Fetching tickets (they're very fetch)...",
      "Support data incoming... supportively...",
      "Ticket system loading... ticketly...",
    ],
  },

  // Navigation loading messages
  navigation: {
    default: [
      "Taking the scenic route...",
      "GPS recalculating... but for web pages...",
      "Almost there (narrator: they weren't)...",
      "Loading page... allegedly...",
      "Teleporting at dial-up speeds...",
      "Finding your page (it was hiding)...",
      "Navigating... navigationally...",
      "Page transition in progress... ish...",
    ],
  },

  // Action loading messages
  action: {
    default: [
      "Doing the thing...",
      "Action in progress... actively...",
      "Working on it... workingly...",
      "Processing your request... process-ily...",
    ],
    saving: [
      "Saving faster than Ctrl+S...",
      "Your changes are going places...",
      "Committing to the database (it's a big commitment)...",
      "Saving... save-ingly...",
    ],
    deleting: [
      "Sending to the void (but safely)...",
      "Making space for new things...",
      "Deleting... delete-ingly...",
      "Gone but not forgotten (actually forgotten)...",
    ],
    updating: [
      "Updating... update-ingly...",
      "Changes incoming...",
      "Refreshing the refresh...",
      "Making things better... probably...",
    ],
  },

  // General fallback messages
  general: {
    default: [
      "Loading... loadingly...",
      "Buffering the buffer...",
      "This usually works faster...",
      "Computing computationally...",
      "Counting backwards from infinity...",
      "Still here? Us too...",
      "Working on it... allegedly...",
      "Loading... with style...",
    ],
  },
};

/**
 * Get random message for a given context
 */
export function getLoadingMessage(
  context: LoadingContext,
  subContext?: LoadingSubContext
): string {
  const contextMessages = loadingMessages[context];

  // Try to get sub-context specific messages first
  if (subContext && contextMessages[subContext]) {
    const messages = contextMessages[subContext];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Fall back to default messages for the context
  const messages = contextMessages.default;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get sequential message (for rotation)
 */
let messageIndex = 0;

export function getSequentialLoadingMessage(
  context: LoadingContext,
  subContext?: LoadingSubContext
): string {
  const contextMessages = loadingMessages[context];

  // Try to get sub-context specific messages first
  let messages: string[];
  if (subContext && contextMessages[subContext]) {
    messages = contextMessages[subContext];
  } else {
    messages = contextMessages.default;
  }

  const message = messages[messageIndex % messages.length];
  messageIndex++;

  return message;
}
