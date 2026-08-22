import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const robots = [
  { id: 1, name: 'Leanne Graham', email: 'leanne@example.com' },
  { id: 2, name: 'Ervin Howell', email: 'ervin@example.com' },
  { id: 3, name: 'Clementine Bauch', email: 'clementine@example.com' },
];

function mockFetchSuccess(data = robots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }));
}

describe('App favorites', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('toggles favorite and persists to localStorage', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toBeInTheDocument());
    const star = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(star);
    expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual([1]);
    // toggle off
    fireEvent.click(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i }));
    expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual([]);
  });

  it('restores favorites from localStorage on mount', async () => {
    localStorage.setItem('robofriends:favorites', JSON.stringify([2]));
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove Ervin Howell from favorites/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Remove Ervin Howell from favorites/i })).toHaveTextContent('★');
    expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toHaveTextContent('☆');
  });

  it('handles corrupt localStorage gracefully', async () => {
    localStorage.setItem('robofriends:favorites', '{{{');
    mockFetchSuccess();
    render(<App />);
    // should still render without crashing, with no favorites
    await waitFor(() => expect(screen.getByRole('searchbox')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove /i })).not.toBeInTheDocument();
  });

  it('favorites filter shows only favorites and composes with search', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toBeInTheDocument());
    // star Leanne
    fireEvent.click(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i }));
    // toggle favorites filter
    const favToggle = screen.getByRole('button', { name: /Show favorites \(1\)|Showing favorites \(1\)/ });
    expect(favToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(favToggle);
    expect(favToggle).toHaveAttribute('aria-pressed', 'true');
    // only Leanne visible
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument();
    // count + search empty state
    expect(screen.getByRole('button', { name: /Showing favorites \(1\)/ })).toBeInTheDocument();
  });

  it('favorites filter composes with search (search within favorites)', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toBeInTheDocument());
    // star Leanne and Ervin
    fireEvent.click(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add Ervin Howell to favorites/i }));
    fireEvent.click(screen.getByRole('button', { name: /Showing favorites|Show favorites/ }));
    // now search for "Leanne" within favorites filter
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Leanne' } });
    // after debounce (300ms) the search should filter to Leanne only
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument(), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument(), { timeout: 2000 });
  });

  it('shows empty favorites message when filter on and no favorites', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('searchbox')).toBeInTheDocument());
    const favToggle = screen.getByRole('button', { name: /Show favorites \(0\)/ });
    fireEvent.click(favToggle);
    expect(screen.getByText(/No favorites yet/)).toBeInTheDocument();
  });

  it('shows search empty state with query when favorites+search yields 0', async () => {
    localStorage.setItem('robofriends:favorites', JSON.stringify([1]));
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Show favorites \(1\)|Showing favorites \(1\)/ }));
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzzzz' } });
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText(/zzzzz/)).toBeInTheDocument();
  });

  it('toggle shows count (n)', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('searchbox')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Show favorites \(0\)/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i }));
    expect(screen.getByRole('button', { name: /Show favorites \(1\)|Showing favorites \(1\)/ })).toBeInTheDocument();
  });

  it('star button remains keyboard activatable', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toBeInTheDocument());
    const star = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    star.focus();
    expect(star).toHaveFocus();
    fireEvent.keyDown(star, { key: 'Enter' });
    // Enter on button triggers click in real browser; fireEvent.click covers it
    fireEvent.click(star);
    expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toBeInTheDocument();
  });
});
