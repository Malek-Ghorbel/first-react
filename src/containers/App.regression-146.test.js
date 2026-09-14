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

describe('regression #146 friendly empty-state when the robot list has no results', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('shows a friendly "No robots found" message below the search box when nothing matches', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('zzzqqq');

    const message = await screen.findByTestId('empty-state');
    expect(message).toBeInTheDocument();
    expect(message.textContent).toMatch(/No robots found/);
    // the query that produced no results is echoed back to the user
    expect(message.textContent).toContain('zzzqqq');
    // the message is announced to assistive tech (live region)
    expect(message).toHaveAttribute('aria-live', 'polite');
    expect(message).toHaveAttribute('role', 'status');
    // no cards are rendered while there are no results
    expect(document.querySelectorAll('.robo-card').length).toBe(0);
    // the message sits below the search box
    const input = screen.getByRole('searchbox');
    expect(input.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides the empty-state message as soon as a non-empty query returns results again', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('zzzqqq');
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());

    // a query that matches again must bring the grid back and drop the message
    typeSearch('Leanne');
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    expect(screen.queryByText(/No robots found/i)).not.toBeInTheDocument();
  });

  it('clearing the search returns to the full list and removes the message', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('zzzqqq');
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('clear-search-empty'));
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('shows the empty-state message when the fetched robots list is empty (no blank grid)', async () => {
    mockFetchSuccess([]);
    render(<App />);
    // empty list -> friendly empty state is still rendered (no blank grid, no crash)
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
    expect(screen.getByTestId('empty-state').textContent).toMatch(/No robots found/);
  });

  it('does not render the empty-state message while matching robots exist (empty query)', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });
});
