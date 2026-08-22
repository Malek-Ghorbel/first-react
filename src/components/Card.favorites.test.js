import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from './Card';

describe('Card favorites', () => {
  it('shows ☆ with Add label when not favorite', () => {
    render(<Card id={1} name="Leanne Graham" email="a@b.com" isFavorite={false} onToggleFavorite={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveTextContent('☆');
    expect(btn).toHaveAttribute('title', 'Add to favorites');
  });

  it('shows ★ with Remove label when favorite', () => {
    render(<Card id={1} name="Leanne Graham" email="a@b.com" isFavorite={true} onToggleFavorite={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveTextContent('★');
    expect(btn).toHaveAttribute('title', 'Remove from favorites');
  });

  it('calls onToggleFavorite with id when clicked', () => {
    const onToggle = jest.fn();
    render(<Card id={42} name="Leanne Graham" email="a@b.com" isFavorite={false} onToggleFavorite={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i }));
    expect(onToggle).toHaveBeenCalledWith(42);
  });

  it('stops propagation so card onSelect is not triggered', () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();
    render(<Card id={1} name="Leanne Graham" email="a@b.com" isFavorite={false} onToggleFavorite={onToggle} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i }));
    expect(onToggle).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('star button is keyboard accessible (Tab reachable)', () => {
    render(<Card id={1} name="Leanne Graham" email="a@b.com" isFavorite={false} onToggleFavorite={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    expect(btn.tagName).toBe('BUTTON');
    // buttons are natively tab reachable (no tabindex=-1)
    expect(btn).not.toHaveAttribute('tabindex', '-1');
  });
});
