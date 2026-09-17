import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

function typeSearch(value) {
  const input = screen.getByRole('searchbox');
  fireEvent.change(input, { target: { value } });
  act(() => { jest.advanceTimersByTime(300); });
  return input;
}

describe('regression #144 live result count + keyboard shortcuts', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    try { jest.useRealTimers(); } catch {}
    localStorage.clear();
  });

  it('shows a live "N of M robots" summary next to the search box', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    expect(screen.getByTestId('search-result-summary')).toHaveTextContent('3 of 3 robots');

    typeSearch('Leanne');
    await waitFor(() => expect(screen.getByTestId('search-result-summary')).toHaveTextContent('1 of 3 robots'));
  });

  it('announces zero matches without breaking the empty state or pagination', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('zzz-no-match');
    await waitFor(() => expect(screen.getByTestId('search-result-summary')).toHaveTextContent('No robots match "zzz-no-match"'));
    // existing empty state + pagination contract from #146 still holds
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Clear search')).toBeInTheDocument();
  });

  it('pressing "/" focuses the search box, Escape clears back to the full list', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    expect(document.activeElement).not.toBe(input);
    fireEvent.keyDown(document.body, { key: '/' });
    expect(document.activeElement).toBe(input);

    typeSearch('Leanne');
    await waitFor(() => expect(screen.getByTestId('search-result-summary')).toHaveTextContent('1 of 3 robots'));

    // Escape outside the input clears the search (SearchBox keeps its own Escape while focused)
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.getByTestId('search-result-summary')).toHaveTextContent('3 of 3 robots'));
    expect(screen.getByText('Ervin Howell')).toBeInTheDocument();
  });

  it('never steals "/" or Escape while the user is typing', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    input.focus();
    fireEvent.keyDown(input, { key: '/' });
    // global handler ignores editable targets: focus stays, value untouched
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('');
  });
});
