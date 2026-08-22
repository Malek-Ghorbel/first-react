import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  const defaultProps = {
    id: 1,
    name: 'Leanne Graham',
    email: 'leanne@example.com',
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders descriptive alt text with robot name', () => {
    render(<Card {...defaultProps} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Robot avatar for Leanne Graham');
  });

  it('renders the robohash image with correct URL', () => {
    render(<Card {...defaultProps} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://robohash.org/1?size=200x200');
  });

  it('displays name and email', () => {
    render(<Card {...defaultProps} />);
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.getByText('leanne@example.com')).toBeInTheDocument();
  });

  it('is focusable and has role button', () => {
    render(<Card {...defaultProps} />);
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '0');
    expect(card).toHaveAttribute('aria-label', 'View details for Leanne Graham');
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<Card {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect on Enter key', () => {
    const onSelect = jest.fn();
    render(<Card {...defaultProps} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect on Space key', () => {
    const onSelect = jest.fn();
    render(<Card {...defaultProps} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
