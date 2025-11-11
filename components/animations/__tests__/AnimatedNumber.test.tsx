import React from 'react';
import { render } from '@testing-library/react';
import { AnimatedNumber } from '../AnimatedNumber';

// Note: AnimatedNumber uses framer-motion which is complex to test in unit tests.
// These tests verify the component renders without crashing.
// Full animation testing is better suited for E2E tests.

describe('AnimatedNumber', () => {
  it('renders without crashing', () => {
    const { container } = render(<AnimatedNumber value={100} />);
    expect(container).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <AnimatedNumber value={100} className="custom-number" />
    );
    const span = container.querySelector('.custom-number');
    expect(span).toBeInTheDocument();
  });

  it('renders with different values', () => {
    const values = [0, 100, 1000, -50, 3.14];
    values.forEach(value => {
      const { container } = render(<AnimatedNumber value={value} />);
      expect(container).toBeInTheDocument();
    });
  });

  it('renders with decimal places', () => {
    const { container } = render(<AnimatedNumber value={100.5} decimals={1} />);
    expect(container).toBeInTheDocument();
  });

  it('renders with prefix and suffix', () => {
    const { container } = render(
      <AnimatedNumber value={100} prefix="$" suffix=" USD" />
    );
    expect(container).toBeInTheDocument();
  });

  it('accepts custom duration prop', () => {
    const { container } = render(<AnimatedNumber value={100} duration={5} />);
    expect(container).toBeInTheDocument();
  });

  it('updates when value prop changes', () => {
    const { container, rerender } = render(<AnimatedNumber value={100} />);
    expect(container).toBeInTheDocument();

    rerender(<AnimatedNumber value={200} />);
    expect(container).toBeInTheDocument();
  });

  it('handles various decimal precision', () => {
    const precisions = [0, 1, 2, 3];
    precisions.forEach(decimals => {
      const { container } = render(
        <AnimatedNumber value={123.456} decimals={decimals} />
      );
      expect(container).toBeInTheDocument();
    });
  });
});
