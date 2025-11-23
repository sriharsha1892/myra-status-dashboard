// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion');
  const React = require('react');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }) => React.createElement('div', props, children),
      span: ({ children, ...props }) => React.createElement('span', props, children),
      button: ({ children, ...props }) => React.createElement('button', props, children),
      a: ({ children, ...props }) => React.createElement('a', props, children),
      p: ({ children, ...props }) => React.createElement('p', props, children),
      h1: ({ children, ...props }) => React.createElement('h1', props, children),
      h2: ({ children, ...props }) => React.createElement('h2', props, children),
      h3: ({ children, ...props }) => React.createElement('h3', props, children),
      li: ({ children, ...props }) => React.createElement('li', props, children),
      ul: ({ children, ...props }) => React.createElement('ul', props, children),
      path: ({ children, ...props }) => React.createElement('path', props, children),
      svg: ({ children, ...props }) => React.createElement('svg', props, children),
    },
    AnimatePresence: ({ children }) => children,
    useMotionValue: () => ({ get: () => 0, set: jest.fn() }),
    useTransform: (value, transformer) => {
      // Return a mock motion value that renders as string
      return '0';
    },
    useSpring: (value) => {
      // Return a mock motion value
      if (typeof value === 'number') {
        return { get: () => value, set: jest.fn() };
      }
      return { get: () => 0, set: jest.fn() };
    },
  };
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Polyfill File.prototype.text() for Jest environment
if (typeof File !== 'undefined' && !File.prototype.text) {
  File.prototype.text = async function() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(this);
    });
  };
}
