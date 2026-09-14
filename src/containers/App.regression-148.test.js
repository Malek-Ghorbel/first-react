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

describe('regression #148 result count above the grid', () => {
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

  it('shows the number of matching robots above the grid', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // "Graham", "Howell" and "Bauch" all end in the letter "h"
    typeSearch('h');

    const count = await screen.findByTestId('result-count');
    expect(count.textContent).toBe('3 robots found');
    // the label sits above the results grid
    const grid = document.querySelector('.card-grid');
    expect(grid).not.toBeNull();
    expect(count.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('updates the count as the query changes', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('h');
    await waitFor(() => expect(screen.getByTestId('result-count').textContent).toBe('3 robots found'));

    typeSearch('Leanne');
    await waitFor(() => expect(screen.getByTestId('result-count').textContent).toBe('1 robot found'));
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument();
  });

  it('uses singular wording for a single match', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('Ervin');

    await waitFor(() => expect(screen.getByTestId('result-count').textContent).toBe('1 robot found'));
  });

  it('hides the count when the query matches no robots', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('zzzqqq');

    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
    expect(screen.queryByTestId('result-count')).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ robots found$/)).not.toBeInTheDocument();
  });

  it('brings the count back when a new query matches again', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('zzzqqq');
    await waitFor(() => expect(screen.queryByTestId('result-count')).not.toBeInTheDocument());

    typeSearch('Leanne');
    await waitFor(() => expect(screen.getByTestId('result-count').textContent).toBe('1 robot found'));
  });

  it('counts every match, not just the cards on the current page', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `Robot ${i + 1}`,
      email: `robot${i + 1}@example.com`,
    }));
    many[2] = { id: 3, name: 'Zed Robot', email: 'zed@example.com' };
    mockFetchSuccess(many);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Robot 1')).toBeInTheDocument());

    // all 8 names contain "Robot", the page size is 6
    typeSearch('Robot');

    await waitFor(() => expect(screen.getByTestId('result-count').textContent).toBe('8 robots found'));
    expect(document.querySelectorAll('.robo-card').length).toBe(6);
  });

  it('does not announce a count while the robot list is empty', async () => {
    mockFetchSuccess([]);
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
    expect(screen.queryByTestId('result-count')).not.toBeInTheDocument();
  });
});
