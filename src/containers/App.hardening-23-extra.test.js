import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
import Card from '../components/Card';
import CardList from '../components/CardList';
import SearchBox from '../components/SearchBox';
import RobotModal from '../components/RobotModal';

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('hardening extra #23: favorites length and non-string guards', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('App guards favorites non-array length without crash (favoritesCount)', async () => {
    mockFetchSuccess([{ id: 1, name: 'Leanne Graham', email: 'a@b.com' }]);
    // corrupt favorites in localStorage as string - should be ignored
    localStorage.setItem('robofriends:favorites', JSON.stringify('not-an-array'));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // Show favorites button should show 0 not crash
    expect(screen.getByRole('button', { name: /Show favorites \(0\)/i })).toBeInTheDocument();
    // toggling filter with corrupted favorites should not throw and should show empty state
    fireEvent.click(screen.getByRole('button', { name: /Show favorites/i }));
    await waitFor(() => expect(screen.getByText(/No favorites yet/)).toBeInTheDocument());
    // add favorite should recover with Array.isArray guard
    fireEvent.click(screen.getByRole('button', { name: /Showing favorites/i })); // back
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(favBtn);
    expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual([1]);
    expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toBeInTheDocument();
  });

  it('App handles numeric/string corrupt favorites directly via CardList', () => {
    const robots = [{ id: 1, name: 'A', email: 'a@b.com' }];
    const cases = ['string', 123, null, {}, 0, false];
    cases.forEach((fav) => {
      const { container, unmount } = render(<CardList robots={robots} favorites={fav} onToggleFavorite={() => {}} />);
      expect(container.querySelector('.robo-card')).toBeInTheDocument();
      // should not mark as favorite
      expect(container.querySelector('.favorite-active')).not.toBeInTheDocument();
      unmount();
    });
  });

  it('Card renders numeric/null name/email without crash', () => {
    const { container } = render(<Card id={1} name={12345} email={67890} isFavorite={false} onToggleFavorite={() => {}} onSelect={() => {}} />);
    expect(container.textContent).toContain('12345');
    expect(container.textContent).toContain('67890');
    expect(container.querySelector('[aria-label="View details for 12345"]')).toBeInTheDocument();
    const { container: c2 } = render(<Card id={2} name={null} email={null} onToggleFavorite={() => {}} />);
    expect(c2.textContent).toContain('');
  });

  it('SearchBox handles numeric value without crash', () => {
    const { container, rerender } = render(<SearchBox value={12345} searchChange={() => {}} onClear={() => {}} />);
    expect(container.querySelector('input').value).toBe('12345');
    expect(container.querySelector('[aria-label="Clear search"]')).toBeInTheDocument();
    rerender(<SearchBox value={null} searchChange={() => {}} onClear={() => {}} />);
    expect(container.querySelector('input').value).toBe('');
    rerender(<SearchBox value={undefined} searchChange={() => {}} onClear={() => {}} />);
    expect(container.querySelector('input').value).toBe('');
  });

  it('RobotModal handles numeric/null robot fields without crash', () => {
    const { container } = render(<RobotModal robot={{ id: 123, name: 456, email: null }} onClose={() => {}} />);
    expect(container.textContent).toContain('456');
    expect(container.textContent).toContain('123');
    // empty string for null email should render without crash
    expect(container.querySelector('#robot-modal-title').textContent).toBe('456');
  });

  it('onSearchChange and onSortChange guard non-string event values', async () => {
    mockFetchSuccess([{ id: 1, name: 'Leanne Graham', email: 'a@b.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // trigger search with normal event
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 123 } }); // numeric value coerced to String
    act(() => { jest.advanceTimersByTime(300); });
    // should not throw, and numeric search string "123" should filter (no match -> empty state)
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    expect(screen.getByText(/123/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // sort with numeric-like value guard
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 123 } });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
  });
});
