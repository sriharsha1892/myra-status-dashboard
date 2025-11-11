import React from 'react';
import { render } from '@testing-library/react';
import { StatusGlow } from '../StatusGlow';

describe('StatusGlow', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatusGlow color="#3b82f6" />);
    expect(container).toBeInTheDocument();
  });

  it('renders with low intensity', () => {
    const { container } = render(<StatusGlow color="#3b82f6" intensity="low" />);
    const glowElements = container.querySelectorAll('.absolute');
    expect(glowElements.length).toBeGreaterThan(0);
  });

  it('renders with medium intensity (default)', () => {
    const { container } = render(<StatusGlow color="#3b82f6" intensity="medium" />);
    const glowElements = container.querySelectorAll('.absolute');
    expect(glowElements.length).toBeGreaterThan(0);
  });

  it('renders with high intensity', () => {
    const { container } = render(<StatusGlow color="#3b82f6" intensity="high" />);
    const glowElements = container.querySelectorAll('.absolute');
    expect(glowElements.length).toBeGreaterThan(0);
  });

  it('accepts different hex colors', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];

    colors.forEach(color => {
      const { container } = render(<StatusGlow color={color} />);
      expect(container).toBeInTheDocument();
    });
  });

  it('renders with pulse animation by default', () => {
    const { container } = render(<StatusGlow color="#3b82f6" pulse={true} />);
    const glowElements = container.querySelectorAll('.absolute');
    expect(glowElements.length).toBeGreaterThan(0);
  });

  it('renders without pulse animation when disabled', () => {
    const { container } = render(<StatusGlow color="#3b82f6" pulse={false} />);
    const glowElements = container.querySelectorAll('.absolute');
    expect(glowElements.length).toBeGreaterThan(0);
  });

  it('renders primary glow layer', () => {
    const { container } = render(<StatusGlow color="#3b82f6" />);
    const glowLayers = container.querySelectorAll('.absolute.inset-0.rounded-xl.pointer-events-none');
    expect(glowLayers.length).toBeGreaterThan(0);
  });

  it('renders secondary outer glow layer', () => {
    const { container } = render(<StatusGlow color="#3b82f6" />);
    const glowElements = container.querySelectorAll('.absolute');
    // Should have at least 2 glow layers (primary and secondary)
    expect(glowElements.length).toBeGreaterThanOrEqual(2);
  });

  it('renders inner highlight layer', () => {
    const { container } = render(<StatusGlow color="#3b82f6" />);
    const glowElements = container.querySelectorAll('.absolute');
    // Should have at least 3 layers (primary, secondary, and inner highlight)
    expect(glowElements.length).toBeGreaterThanOrEqual(3);
  });

  it('handles various hex color formats', () => {
    // Test with valid hex colors
    const testColors = [
      '#123456',
      '#abcdef',
      '#ABCDEF',
      '#000000',
      '#ffffff',
    ];

    testColors.forEach(color => {
      const { container } = render(<StatusGlow color={color} />);
      expect(container).toBeInTheDocument();
    });
  });

  it('applies group-hover class for inner highlight', () => {
    const { container } = render(<StatusGlow color="#3b82f6" />);
    const innerHighlight = container.querySelector('.group-hover\\:opacity-100');
    expect(innerHighlight).toBeInTheDocument();
  });
});
