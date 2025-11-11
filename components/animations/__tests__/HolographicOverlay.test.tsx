import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HolographicOverlay } from '../HolographicOverlay';

describe('HolographicOverlay', () => {
  it('renders children correctly', () => {
    render(
      <HolographicOverlay>
        <div>Test Content</div>
      </HolographicOverlay>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders with default intensity', () => {
    const { container } = render(
      <HolographicOverlay>
        <div>Default Intensity</div>
      </HolographicOverlay>
    );
    expect(container.querySelector('.relative.overflow-hidden')).toBeInTheDocument();
  });

  it('renders with custom intensity', () => {
    const { container } = render(
      <HolographicOverlay intensity={0.7}>
        <div>Custom Intensity</div>
      </HolographicOverlay>
    );
    expect(screen.getByText('Custom Intensity')).toBeInTheDocument();
  });

  it('handles mouse move event', () => {
    const { container } = render(
      <HolographicOverlay>
        <div>Mouse Move Test</div>
      </HolographicOverlay>
    );

    const wrapper = container.querySelector('.relative') as HTMLElement;

    // Mock getBoundingClientRect
    wrapper.getBoundingClientRect = jest.fn(() => ({
      width: 300,
      height: 300,
      left: 0,
      top: 0,
      right: 300,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));

    fireEvent.mouseMove(wrapper, { clientX: 150, clientY: 150 });

    expect(screen.getByText('Mouse Move Test')).toBeInTheDocument();
  });

  it('renders holographic gradient overlay', () => {
    const { container } = render(
      <HolographicOverlay>
        <div>Gradient</div>
      </HolographicOverlay>
    );

    const overlays = container.querySelectorAll('.absolute.inset-0');
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('renders rainbow shimmer effect', () => {
    const { container } = render(
      <HolographicOverlay>
        <div>Shimmer</div>
      </HolographicOverlay>
    );

    const overlays = container.querySelectorAll('.absolute.inset-0');
    // Should have multiple overlays for different effects
    expect(overlays.length).toBeGreaterThan(1);
  });

  it('renders iridescent edge glow', () => {
    const { container } = render(
      <HolographicOverlay>
        <div>Edge Glow</div>
      </HolographicOverlay>
    );

    const edgeGlow = container.querySelector('.rounded-xl');
    expect(edgeGlow).toBeInTheDocument();
  });

  it('applies pointer-events-auto style', () => {
    const { container } = render(
      <HolographicOverlay>
        <div>Pointer Events</div>
      </HolographicOverlay>
    );

    const wrapper = container.querySelector('.relative') as HTMLElement;
    expect(wrapper).toHaveStyle({ pointerEvents: 'auto' });
  });

  it('renders content in z-10 layer', () => {
    const { container } = render(
      <HolographicOverlay>
        <div>Z-Index Test</div>
      </HolographicOverlay>
    );

    const contentLayer = container.querySelector('.relative.z-10');
    expect(contentLayer).toBeInTheDocument();
    expect(contentLayer).toHaveTextContent('Z-Index Test');
  });

  it('handles low intensity value', () => {
    const { container } = render(
      <HolographicOverlay intensity={0.1}>
        <div>Low Intensity</div>
      </HolographicOverlay>
    );
    expect(screen.getByText('Low Intensity')).toBeInTheDocument();
  });

  it('handles high intensity value', () => {
    const { container } = render(
      <HolographicOverlay intensity={0.9}>
        <div>High Intensity</div>
      </HolographicOverlay>
    );
    expect(screen.getByText('High Intensity')).toBeInTheDocument();
  });

  it('applies opacity-0 hover:opacity-100 classes', () => {
    const { container } = render(
      <HolographicOverlay>
        <div>Hover Opacity</div>
      </HolographicOverlay>
    );

    const hoverElements = container.querySelectorAll('.hover\\:opacity-100');
    expect(hoverElements.length).toBeGreaterThan(0);
  });

  it('uses overflow-hidden for container', () => {
    const { container } = render(
      <HolographicOverlay>
        <div>Overflow Hidden</div>
      </HolographicOverlay>
    );

    const wrapper = container.querySelector('.overflow-hidden');
    expect(wrapper).toBeInTheDocument();
  });
});
