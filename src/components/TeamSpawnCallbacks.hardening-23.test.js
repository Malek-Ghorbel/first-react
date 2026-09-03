import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from './Card';
import CardList from './CardList';
import SearchBox from './SearchBox';

describe('regression #23 team spawn verifier: callback guards (Card/SearchBox/CardList)', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('Card safe callbacks', () => {
    it('does not throw when onSelect is non-function and card clicked or key pressed', () => {
      const badCallbacks = ['string', 123, {}, [], 0, false, null, undefined];
      for (const bad of badCallbacks) {
        const { container, unmount } = render(<Card id={1} name="Leanne" email="a@b.com" onSelect={bad} onToggleFavorite={jest.fn()} />);
        expect(() => fireEvent.click(container.querySelector('[role="button"]'))).not.toThrow();
        expect(() => fireEvent.keyDown(container.querySelector('[role="button"]'), { key: 'Enter' })).not.toThrow();
        expect(() => fireEvent.keyDown(container.querySelector('[role="button"]'), { key: ' ' })).not.toThrow();
        unmount();
      }
    });

    it('does not render favorite button when onToggleFavorite is non-function', () => {
      const bad = ['string', 123, {}, [], 0, false, null, undefined];
      for (const b of bad) {
        const { container, unmount } = render(<Card id={1} name="Leanne" email="a@b.com" onToggleFavorite={b} onSelect={jest.fn()} />);
        expect(container.querySelector('.favorite-btn')).not.toBeInTheDocument();
        // clicking card should not throw even without favorite button
        expect(() => fireEvent.click(container.querySelector('[role="button"]'))).not.toThrow();
        unmount();
      }
    });

    it('does not throw when onToggleFavorite is non-function and favorite button would have been clicked (guarded via safeOnToggle)', () => {
      // When onToggleFavorite is bad, button shouldn't exist, so no throw.
      // Also test that Card with bad onToggle but no button doesn't crash on prop change
      const { container } = render(<Card id={1} name="Leanne" email="a@b.com" isFavorite={false} onToggleFavorite={'bad'} />);
      expect(container.querySelector('button')).not.toBeInTheDocument();
    });

    it('still calls onSelect and onToggleFavorite when they are valid functions', () => {
      const onSelect = jest.fn();
      const onToggle = jest.fn();
      const { container } = render(<Card id={42} name="Leanne" email="a@b.com" onSelect={onSelect} onToggleFavorite={onToggle} isFavorite={false} />);
      fireEvent.click(container.querySelector('[role="button"]'));
      expect(onSelect).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(container.querySelector('[role="button"]'), { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(2);
      fireEvent.click(screen.getByRole('button', { name: /Add Leanne to favorites/i }));
      expect(onToggle).toHaveBeenCalledWith(42);
    });
  });

  describe('SearchBox safe callbacks', () => {
    it('does not throw when onClear is non-function and clear button clicked', () => {
      const bad = ['string', 123, {}, [], 0, false, null, undefined];
      for (const b of bad) {
        const { container, unmount } = render(<SearchBox value="test" searchChange={jest.fn()} onClear={b} />);
        const btn = container.querySelector('[data-testid="search-clear-btn"]');
        expect(btn).toBeInTheDocument();
        expect(() => fireEvent.click(btn)).not.toThrow();
        unmount();
      }
    });

    it('does not throw when searchChange is non-function and input changes', () => {
      const bad = ['string', 123, {}, [], null, undefined, 0, false];
      for (const b of bad) {
        const { container, unmount } = render(<SearchBox value="" searchChange={b} onClear={jest.fn()} />);
        const input = container.querySelector('input');
        expect(() => fireEvent.change(input, { target: { value: 'hello' } })).not.toThrow();
        unmount();
      }
    });

    it('still calls onClear and searchChange when valid', () => {
      const onClear = jest.fn();
      const searchChange = jest.fn();
      render(<SearchBox value="test" onClear={onClear} searchChange={searchChange} />);
      fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
      expect(onClear).toHaveBeenCalledTimes(1);
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'new' } });
      expect(searchChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('CardList safe callbacks', () => {
    it('does not throw when onToggleFavorite/onSelect are non-functions', () => {
      const robots = [{ id: 1, name: 'A', email: 'a@b.com' }, { id: 2, name: 'B', email: 'b@b.com' }];
      const bad = ['string', 123, {}, [], 0, false, null, undefined];
      for (const b of bad) {
        const { container, unmount } = render(<CardList robots={robots} onToggleFavorite={b} onSelect={b} />);
        expect(container.querySelectorAll('.robo-card').length).toBe(2);
        // clicking cards should not throw
        const cards = container.querySelectorAll('[role="button"]');
        for (const card of cards) {
          expect(() => fireEvent.click(card)).not.toThrow();
          expect(() => fireEvent.keyDown(card, { key: 'Enter' })).not.toThrow();
        }
        unmount();
      }
    });

    it('still spawns cards and calls callbacks when valid', () => {
      const robots = [{ id: 1, name: 'A', email: 'a@b.com' }];
      const onToggle = jest.fn();
      const onSelect = jest.fn();
      const { container } = render(<CardList robots={robots} favorites={[1]} onToggleFavorite={onToggle} onSelect={onSelect} />);
      expect(container.querySelector('.robo-card')).toBeInTheDocument();
      // favorite button should be present and callable
      fireEvent.click(screen.getByRole('button', { name: /Remove A from favorites|Add A to favorites/i }));
      expect(onToggle).toHaveBeenCalledWith(1);
      fireEvent.click(container.querySelector('[role="button"]'));
      expect(onSelect).toHaveBeenCalledWith(robots[0]);
    });

    it('guards corrupted robots and favorites without crash via safe callbacks', () => {
      const badRobots = [null, undefined, { name: 'NoId' }, { id: 1, name: 'Valid' }];
      const { container } = render(<CardList robots={badRobots} favorites={'bad'} onToggleFavorite={'bad'} onSelect={123} />);
      expect(container.querySelectorAll('.robo-card').length).toBe(1);
      expect(container.textContent).toContain('Valid');
    });
  });
});
