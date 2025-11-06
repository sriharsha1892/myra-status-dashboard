import toast from 'react-hot-toast';

/**
 * Naval Ravikant-style contextual success toasts
 * "Specific knowledge is knowledge you cannot be trained for" - Naval
 *
 * Usage: import { showUserCreatedToast } from '@/utils/navalToasts'
 */

interface ToastOptions {
  customMessage?: string;
  customQuote?: string;
}

// Base Naval quotes for general actions
const generalQuotes = [
  "Compounding works",
  "Specific knowledge applied",
  "Leverage achieved",
  "Long-term game: played",
  "Build, then sell",
  "Code is leverage",
  "Escape competition through authenticity",
  "The obstacle was the button",
  "Productize yourself",
];

function getRandomQuote(quotes: string[]): string {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function showNavalToast(message: string, quote: string) {
  toast.success(
    <div className="flex flex-col gap-1">
      <div className="font-semibold text-sm">{message}</div>
      <div className="text-xs opacity-75 italic">"{quote}"</div>
    </div>,
    {
      duration: 3500,
      icon: '✨',
      style: {
        background: '#10b981',
        color: '#fff',
      },
    }
  );
}

// User Actions
export function showUserCreatedToast(userName: string, options?: ToastOptions) {
  const quotes = [
    "Specific person added. Compounding begins.",
    "Play long-term games with long-term people",
    "Seek wealth, not status. Seek talent, not resumes.",
    "Accountability starts with hiring",
    "Leverage: people edition",
  ];
  showNavalToast(
    options?.customMessage || `${userName} created successfully`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

export function showUserDeletedToast(userName: string, options?: ToastOptions) {
  const quotes = [
    "Subtraction is success. Simplify ruthlessly.",
    "Clear the noise. Focus on signal.",
    "Less but better",
    "Deletion is a feature, not a bug",
    "Escape competition through subtraction",
  ];
  showNavalToast(
    options?.customMessage || `${userName} removed`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

export function showUserUpdatedToast(userName: string, options?: ToastOptions) {
  const quotes = [
    "Iteration is leverage",
    "Productize, then optimize",
    "Specific knowledge: refined",
    "Compounding improvements",
    "Long-term thinking applied",
  ];
  showNavalToast(
    options?.customMessage || `${userName} updated`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

// Trial Organization Actions
export function showTrialCreatedToast(orgName: string, options?: ToastOptions) {
  const quotes = [
    "Validation loop: initiated",
    "Product-market fit: seeking",
    "Play stupid games, win stupid prizes. Play this game.",
    "Specific customers > Generic markets",
    "Build leverage, one trial at a time",
  ];
  showNavalToast(
    options?.customMessage || `${orgName} trial created`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

export function showTrialUpdatedToast(orgName: string, options?: ToastOptions) {
  const quotes = [
    "Iterate fast, compound faster",
    "Feedback is leverage",
    "Specific insights applied",
    "Long-term customers: cultivating",
    "Productize, then scale",
  ];
  showNavalToast(
    options?.customMessage || `${orgName} updated`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

export function showTrialDeletedToast(orgName: string, options?: ToastOptions) {
  const quotes = [
    "Not all trials compound. Let go.",
    "Saying no is underrated",
    "Focus on who says yes",
    "Clear, then build",
    "Arm candy vs soulmate: choose wisely",
  ];
  showNavalToast(
    options?.customMessage || `${orgName} removed`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

// Data and Settings Actions
export function showDataSavedToast(options?: ToastOptions) {
  const quotes = [
    "Leverage stored. Read it later.",
    "Specific knowledge: saved",
    "Your future self thanks you",
    "Compound interest on information",
    "Data is the new oil. This is refined.",
  ];
  showNavalToast(
    options?.customMessage || 'Data saved successfully',
    options?.customQuote || getRandomQuote(quotes)
  );
}

export function showSettingsUpdatedToast(options?: ToastOptions) {
  const quotes = [
    "Preferences: productized",
    "Optimize yourself first",
    "Specific taste matters",
    "Automate, then delegate",
    "Systems > Goals",
  ];
  showNavalToast(
    options?.customMessage || 'Settings updated',
    options?.customQuote || getRandomQuote(quotes)
  );
}

// Ticket Actions
export function showTicketCreatedToast(ticketId: string, options?: ToastOptions) {
  const quotes = [
    "Accountability begins here",
    "Track it, then solve it",
    "Specific problems need specific solutions",
    "Long-term support: engaged",
    "Customer obsession: applied",
  ];
  showNavalToast(
    options?.customMessage || `Ticket #${ticketId} created`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

export function showTicketResolvedToast(ticketId: string, options?: ToastOptions) {
  const quotes = [
    "Problem solved. Leverage maintained.",
    "Obstacles cleared. Momentum restored.",
    "Specific solution: delivered",
    "Long-term trust: compounded",
    "Done is better than perfect (but this is both)",
  ];
  showNavalToast(
    options?.customMessage || `Ticket #${ticketId} resolved`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

// Bulk Actions
export function showBulkActionToast(action: string, count: number, options?: ToastOptions) {
  const quotes = [
    "Leverage at scale",
    "Batch processing is leverage",
    "Automate the repetitive",
    "Systems compound faster than tasks",
    "One to many: maximum leverage",
  ];
  showNavalToast(
    options?.customMessage || `${action} ${count} items`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

// Import/Export Actions
export function showImportSuccessToast(count: number, options?: ToastOptions) {
  const quotes = [
    "Data migrated. Leverage imported.",
    "Specific knowledge: transferred",
    "Build once, use everywhere",
    "Compound your database",
    "Automation wins",
  ];
  showNavalToast(
    options?.customMessage || `Imported ${count} items`,
    options?.customQuote || getRandomQuote(quotes)
  );
}

export function showExportSuccessToast(options?: ToastOptions) {
  const quotes = [
    "Portability is leverage",
    "Own your data. Always.",
    "Specific knowledge: packaged",
    "Build to last, export to share",
    "Information wants to be free (and yours)",
  ];
  showNavalToast(
    options?.customMessage || 'Export completed',
    options?.customQuote || getRandomQuote(quotes)
  );
}

// Generic success toast with Naval flavor
export function showSuccessToast(message: string, options?: ToastOptions) {
  showNavalToast(
    message,
    options?.customQuote || getRandomQuote(generalQuotes)
  );
}

// Error toast with Naval-style acceptance
export function showErrorToast(message: string, options?: { customQuote?: string }) {
  const quotes = [
    "Acceptance is key",
    "Desire is suffering (but we'll fix this)",
    "The obstacle is the way",
    "Patience is not passivity",
    "Long-term games only",
  ];

  toast.error(
    <div className="flex flex-col gap-1">
      <div className="font-semibold text-sm">{message}</div>
      <div className="text-xs opacity-75 italic">"{options?.customQuote || getRandomQuote(quotes)}"</div>
    </div>,
    {
      duration: 4000,
      style: {
        background: '#ef4444',
        color: '#fff',
      },
    }
  );
}

// Loading toast with Naval wisdom
export function showLoadingToast(message: string) {
  const quotes = [
    "Patience is not passivity",
    "Compounding takes time",
    "Play the long game",
    "Desire is suffering. Wait.",
    "The best things take time",
  ];

  return toast.loading(
    <div className="flex flex-col gap-1">
      <div className="font-semibold text-sm">{message}</div>
      <div className="text-xs opacity-75 italic">"{getRandomQuote(quotes)}"</div>
    </div>,
    {
      duration: Infinity,
    }
  );
}
