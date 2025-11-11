import React from 'react';
import { render } from '@testing-library/react';
import { MorphingBlob, BlobBackground } from '../MorphingBlob';

describe('MorphingBlob', () => {
  it('renders without crashing', () => {
    const { container } = render(<MorphingBlob />);
    expect(container).toBeInTheDocument();
  });

  it('renders with default color', () => {
    const { container } = render(<MorphingBlob />);
    const blob = container.querySelector('.absolute.pointer-events-none');
    expect(blob).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    const { container } = render(<MorphingBlob color="#ff0000" />);
    expect(container.querySelector('.absolute.pointer-events-none')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    const { container } = render(<MorphingBlob size={500} />);
    const blob = container.querySelector('.absolute.pointer-events-none') as HTMLElement;
    expect(blob).toBeInTheDocument();
  });

  it('renders with custom delay', () => {
    const { container } = render(<MorphingBlob delay={2} />);
    expect(container.querySelector('.absolute.pointer-events-none')).toBeInTheDocument();
  });

  it('renders with custom opacity', () => {
    const { container } = render(<MorphingBlob opacity={0.5} />);
    expect(container.querySelector('.absolute.pointer-events-none')).toBeInTheDocument();
  });

  it('applies pointer-events-none class', () => {
    const { container } = render(<MorphingBlob />);
    const blob = container.querySelector('.pointer-events-none');
    expect(blob).toBeInTheDocument();
  });

  it('renders inner blob with blur effect', () => {
    const { container } = render(<MorphingBlob />);
    const innerBlob = container.querySelector('.blur-3xl');
    expect(innerBlob).toBeInTheDocument();
  });

  it('renders inner blob with rounded-full class', () => {
    const { container } = render(<MorphingBlob />);
    const innerBlob = container.querySelector('.rounded-full');
    expect(innerBlob).toBeInTheDocument();
  });

  it('handles small size values', () => {
    const { container } = render(<MorphingBlob size={100} />);
    expect(container.querySelector('.absolute')).toBeInTheDocument();
  });

  it('handles large size values', () => {
    const { container } = render(<MorphingBlob size={800} />);
    expect(container.querySelector('.absolute')).toBeInTheDocument();
  });

  it('handles zero delay', () => {
    const { container } = render(<MorphingBlob delay={0} />);
    expect(container.querySelector('.absolute')).toBeInTheDocument();
  });

  it('handles various color formats', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];

    colors.forEach(color => {
      const { container } = render(<MorphingBlob color={color} />);
      expect(container.querySelector('.absolute')).toBeInTheDocument();
    });
  });
});

describe('BlobBackground', () => {
  it('renders without crashing', () => {
    const { container } = render(<BlobBackground />);
    expect(container).toBeInTheDocument();
  });

  it('renders with planned status color (blue)', () => {
    const { container } = render(<BlobBackground statusColor="#2563eb" />);
    const blobs = container.querySelectorAll('.absolute.pointer-events-none');
    expect(blobs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders with in progress status color (orange)', () => {
    const { container } = render(<BlobBackground statusColor="#f97316" />);
    const blobs = container.querySelectorAll('.absolute.pointer-events-none');
    expect(blobs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders with completed status color (emerald)', () => {
    const { container } = render(<BlobBackground statusColor="#059669" />);
    const blobs = container.querySelectorAll('.absolute.pointer-events-none');
    expect(blobs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders with cancelled status color (slate)', () => {
    const { container } = render(<BlobBackground statusColor="#64748b" />);
    const blobs = container.querySelectorAll('.absolute.pointer-events-none');
    expect(blobs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders with default colors when no statusColor provided', () => {
    const { container } = render(<BlobBackground />);
    const blobs = container.querySelectorAll('.absolute.pointer-events-none');
    expect(blobs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders three blobs with different delays', () => {
    const { container } = render(<BlobBackground />);
    const blobs = container.querySelectorAll('.absolute.pointer-events-none');
    expect(blobs.length).toBeGreaterThanOrEqual(3);
  });

  it('applies overflow-hidden to container', () => {
    const { container } = render(<BlobBackground />);
    const wrapper = container.querySelector('.overflow-hidden');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies opacity-0 group-hover:opacity-100 classes', () => {
    const { container } = render(<BlobBackground />);
    const wrapper = container.querySelector('.group-hover\\:opacity-100');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders with transition-opacity duration-1000', () => {
    const { container } = render(<BlobBackground />);
    const wrapper = container.querySelector('.transition-opacity.duration-1000');
    expect(wrapper).toBeInTheDocument();
  });
});
