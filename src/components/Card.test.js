import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  it('renders descriptive alt text with robot name', () => {
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" onSelect={() => {}} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Robot avatar for Leanne Graham');
  });

  it('renders the robohash image with correct URL', () => {
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" onSelect={() => {}} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://robohash.org/1?size=200x200');
  });

  it('displays name and email', () => {
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" onSelect={() => {}} />);
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.getByText('leanne@example.com')).toBeInTheDocument();
  });

  it('has role="button" and tabIndex for accessibility', () => {
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" onSelect={() => {}} />);
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('aria-label', 'View details for Leanne Graham');
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" onSelect={onSelect} />);
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when Enter key is pressed', () => {
    const onSelect = jest.fn();
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" onSelect={onSelect} />);
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when Space key is pressed', () => {
    const onSelect = jest.fn();
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" onSelect={onSelect} />);
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
