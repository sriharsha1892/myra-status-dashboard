import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MagneticCard } from '../MagneticCard';

describe('MagneticCard', () => {
  it('renders children correctly', () => {
    render(
      <MagneticCard>
        <div>Test Content</div>
      </MagneticCard>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MagneticCard className="custom-class">
        <div>Test</div>
      </MagneticCard>
    );
    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });

  it('handles onClick event', () => {
    const handleClick = jest.fn();
    render(
      <MagneticCard onClick={handleClick}>
        <div>Click Me</div>
      </MagneticCard>
    );

    const card = screen.getByText('Click Me').closest('div');
    if (card && card.parentElement) {
      fireEvent.click(card.parentElement);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });

  it('handles mouse enter event', () => {
    const { container } = render(
      <MagneticCard>
        <div>Hover Test</div>
      </MagneticCard>
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(card);

    // Component should be in the document after hover
    expect(screen.getByText('Hover Test')).toBeInTheDocument();
  });

  it('handles mouse leave event', () => {
    const { container } = render(
      <MagneticCard>
        <div>Hover Test</div>
      </MagneticCard>
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);

    // Component should still be in the document after mouse leave
    expect(screen.getByText('Hover Test')).toBeInTheDocument();
  });

  it('handles mouse move event', () => {
    const { container } = render(
      <MagneticCard>
        <div>Move Test</div>
      </MagneticCard>
    );

    const card = container.firstChild as HTMLElement;

    // Mock getBoundingClientRect
    card.getBoundingClientRect = jest.fn(() => ({
      width: 200,
      height: 200,
      left: 0,
      top: 0,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));

    fireEvent.mouseMove(card, { clientX: 100, clientY: 100 });

    // Component should still be in the document after mouse move
    expect(screen.getByText('Move Test')).toBeInTheDocument();
  });

  it('renders with custom index for animation delay', () => {
    render(
      <MagneticCard index={5}>
        <div>Delayed Animation</div>
      </MagneticCard>
    );
    expect(screen.getByText('Delayed Animation')).toBeInTheDocument();
  });

  it('renders glassmorphism overlay', () => {
    const { container } = render(
      <MagneticCard>
        <div>Glass Effect</div>
      </MagneticCard>
    );

    // Check if overlay elements exist
    const overlays = container.querySelectorAll('.absolute');
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('renders content in relative z-index layer', () => {
    const { container } = render(
      <MagneticCard>
        <div>Z-Index Test</div>
      </MagneticCard>
    );

    const contentLayer = container.querySelector('.relative.z-10');
    expect(contentLayer).toBeInTheDocument();
    expect(contentLayer).toHaveTextContent('Z-Index Test');
  });
});
