import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChromaticShift } from '../ChromaticShift';

describe('ChromaticShift', () => {
  it('renders children correctly', () => {
    render(
      <ChromaticShift>
        <div>Test Content</div>
      </ChromaticShift>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders with default intensity', () => {
    const { container } = render(
      <ChromaticShift>
        <div>Default Intensity</div>
      </ChromaticShift>
    );
    expect(container.querySelector('.relative')).toBeInTheDocument();
  });

  it('renders with custom intensity', () => {
    const { container } = render(
      <ChromaticShift intensity={0.8}>
        <div>High Intensity</div>
      </ChromaticShift>
    );
    expect(container.querySelector('.relative')).toBeInTheDocument();
  });

  it('handles mouse enter event', () => {
    const { container } = render(
      <ChromaticShift>
        <div>Hover Test</div>
      </ChromaticShift>
    );

    const wrapper = container.querySelector('.relative') as HTMLElement;
    fireEvent.mouseEnter(wrapper);

    expect(screen.getByText('Hover Test')).toBeInTheDocument();
  });

  it('handles mouse leave event', () => {
    const { container } = render(
      <ChromaticShift>
        <div>Hover Test</div>
      </ChromaticShift>
    );

    const wrapper = container.querySelector('.relative') as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);

    expect(screen.getByText('Hover Test')).toBeInTheDocument();
  });

  it('renders red channel overlay', () => {
    const { container } = render(
      <ChromaticShift>
        <div>Red Channel</div>
      </ChromaticShift>
    );

    const overlays = container.querySelectorAll('.absolute.inset-0');
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('renders blue channel overlay', () => {
    const { container } = render(
      <ChromaticShift>
        <div>Blue Channel</div>
      </ChromaticShift>
    );

    const overlays = container.querySelectorAll('.absolute.inset-0');
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('renders SVG filters', () => {
    const { container } = render(
      <ChromaticShift>
        <div>Filters</div>
      </ChromaticShift>
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with pointer-events-auto style', () => {
    const { container } = render(
      <ChromaticShift>
        <div>Pointer Events</div>
      </ChromaticShift>
    );

    const wrapper = container.querySelector('.relative') as HTMLElement;
    expect(wrapper).toHaveStyle({ pointerEvents: 'auto' });
  });

  it('renders main content in z-10 layer', () => {
    const { container } = render(
      <ChromaticShift>
        <div>Z-Index Test</div>
      </ChromaticShift>
    );

    const contentLayer = container.querySelector('.relative.z-10');
    expect(contentLayer).toBeInTheDocument();
    expect(contentLayer).toHaveTextContent('Z-Index Test');
  });

  it('handles low intensity value', () => {
    const { container } = render(
      <ChromaticShift intensity={0.1}>
        <div>Low Intensity</div>
      </ChromaticShift>
    );
    expect(screen.getByText('Low Intensity')).toBeInTheDocument();
  });

  it('handles high intensity value', () => {
    const { container } = render(
      <ChromaticShift intensity={1.0}>
        <div>Max Intensity</div>
      </ChromaticShift>
    );
    expect(screen.getByText('Max Intensity')).toBeInTheDocument();
  });

  it('applies mix-blend-screen to overlays', () => {
    const { container } = render(
      <ChromaticShift>
        <div>Blend Mode</div>
      </ChromaticShift>
    );

    const overlays = container.querySelectorAll('.mix-blend-screen');
    expect(overlays.length).toBeGreaterThan(0);
  });
});
