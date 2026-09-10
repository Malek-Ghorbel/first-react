import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Card from './Card';

describe('regression-109: keyboard activation of the favorite star must not open the details modal', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('does not call onSelect when Enter/Space is pressed on the focused star', () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();
    render(
      <Card
        id={1}
        name="Leanne"
        email="a@a.com"
        isFavorite={false}
        onToggleFavorite={onToggle}
        onSelect={onSelect}
      />
    );
    const star = screen.getByRole('button', { name: /Add Leanne to favorites/i });

    fireEvent.keyDown(star, { key: 'Enter' });
    fireEvent.keyDown(star, { key: ' ' });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keeps the star natively activatable so the favorite still toggles exactly once per activation', () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();
    render(
      <Card
        id={1}
        name="Leanne"
        email="a@a.com"
        isFavorite={false}
        onToggleFavorite={onToggle}
        onSelect={onSelect}
      />
    );
    const star = screen.getByRole('button', { name: /Add Leanne to favorites/i });

    // Browsers dispatch a click on the button for Enter/Space activation.
    fireEvent.keyDown(star, { key: 'Enter' });
    fireEvent.click(star);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('leaves mouse click behaviour on the star unchanged', () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();
    render(
      <Card
        id={7}
        name="Leanne"
        email="a@a.com"
        isFavorite={false}
        onToggleFavorite={onToggle}
        onSelect={onSelect}
      />
    );
    const star = screen.getByRole('button', { name: /Add Leanne to favorites/i });

    fireEvent.click(star);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(7);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('still opens the details modal for Enter/Space on the card body itself', () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();
    render(
      <Card
        id={1}
        name="Leanne"
        email="a@a.com"
        isFavorite={false}
        onToggleFavorite={onToggle}
        onSelect={onSelect}
      />
    );
    const card = screen.getByRole('button', { name: /View details for Leanne/i });

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
