'use client';

import { useState, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Industry } from './data/companies';
import CompanySearch, { SelectedCompany } from './components/CompanySearch';
import ApproachSelector, { Approach } from './components/ApproachSelector';
import WorkflowVisualization from './components/WorkflowVisualization';
import WorkflowTransformed from './components/WorkflowTransformed';
import DemoTransition from './components/DemoTransition';

// Demo flow steps
type DemoStep =
  | 'company-entry'
  | 'approach-select'
  | 'pain-visualization'
  | 'solution-reveal'
  | 'transition';

// Demo state
interface DemoState {
  step: DemoStep;
  company: SelectedCompany | null;
  selectedApproaches: Approach[];
}

const initialState: DemoState = {
  step: 'company-entry',
  company: null,
  selectedApproaches: [],
};

function DemoPageContent() {
  const [state, setState] = useState<DemoState>(initialState);

  // Step handlers
  const handleCompanySelect = (company: SelectedCompany) => {
    setState((prev) => ({
      ...prev,
      company,
      step: 'approach-select',
    }));
  };

  const handleApproachesSelect = (approaches: Approach[]) => {
    setState((prev) => ({
      ...prev,
      selectedApproaches: approaches,
      step: 'pain-visualization',
    }));
  };

  const handlePainContinue = () => {
    setState((prev) => ({
      ...prev,
      step: 'solution-reveal',
    }));
  };

  const handleSolutionContinue = () => {
    setState((prev) => ({
      ...prev,
      step: 'transition',
    }));
  };

  const handleSkipToDemo = () => {
    setState((prev) => ({
      ...prev,
      step: 'transition',
    }));
  };

  const handleBack = () => {
    setState((prev) => {
      const stepOrder: DemoStep[] = [
        'company-entry',
        'approach-select',
        'pain-visualization',
        'solution-reveal',
        'transition',
      ];
      const currentIndex = stepOrder.indexOf(prev.step);
      if (currentIndex > 0) {
        return { ...prev, step: stepOrder[currentIndex - 1] };
      }
      return prev;
    });
  };

  const handleStartOver = () => {
    setState(initialState);
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: '#0B0A14' }}
    >
      {/* Animated gradient background - dark theme mesh */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Dark mesh gradient orbs */}
        <div
          className="absolute top-0 left-0 w-[60%] h-[60%] blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[50%] h-[50%] blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #A78BFA 0%, transparent 70%)' }}
        />
      </div>

      {/* Subtle gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
        }}
      />

      {/* Main content */}
      <main className="relative z-10 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {state.step === 'company-entry' && (
            <motion.div
              key="company-entry"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CompanySearch
                onCompanySelect={handleCompanySelect}
                onSkipToDemo={handleSkipToDemo}
              />
            </motion.div>
          )}

          {state.step === 'approach-select' && state.company && (
            <motion.div
              key="approach-select"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <ApproachSelector
                companyName={state.company.name}
                onApproachesSelect={handleApproachesSelect}
                onSkipToDemo={handleSkipToDemo}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {state.step === 'pain-visualization' && state.company && (
            <motion.div
              key="pain-visualization"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <WorkflowVisualization
                companyName={state.company.name}
                selectedApproaches={state.selectedApproaches}
                onContinue={handlePainContinue}
                onSkipToDemo={handleSkipToDemo}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {state.step === 'solution-reveal' && state.company && (
            <motion.div
              key="solution-reveal"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
            >
              <WorkflowTransformed
                companyName={state.company.name}
                onContinue={handleSolutionContinue}
                onSkipToDemo={handleSkipToDemo}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {state.step === 'transition' && (
            <motion.div
              key="transition"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DemoTransition
                companyName={state.company?.name || ''}
                industry={(state.company?.industry as Industry) || null}
                onStartOver={handleStartOver}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Loading fallback
function DemoPageLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0B0A14' }}
    >
      <div className="text-white/50">
        Loading...
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<DemoPageLoading />}>
      <DemoPageContent />
    </Suspense>
  );
}
