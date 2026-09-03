import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
  { id: 4, name: 'Patricia Lebsack', email: 'Julianne.OConner@kory.org' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}
function mockFetchFailure(status = 500) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) }));
}
function mockFetchInvalid(payload) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) }));
}

describe('regression #23: verify end-to-end guards', () => {
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

  it('regression: invalid data format (non-array) does not crash, shows error', async () => {
    mockFetchInvalid({ not: 'array' });
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Invalid data format/)).toBeInTheDocument());
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
  });

  it('regression: invalid data null shows error', async () => {
    mockFetchInvalid(null);
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Invalid data format/)).toBeInTheDocument());
  });

  it('regression: robot missing name does not throw during search filter', async () => {
    const bad = [{ id: 1, email: 'a@b.com' }, { id: 2, name: 'Ervin Howell', email: 'b@c.com' }];
    mockFetchSuccess(bad);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Ervin' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    // no crash when filtering with missing name
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('regression: empty search empty-state does not duplicate Clear search buttons', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzzzNotExist' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    // hideClear prop ensures only one Clear search button in empty state (the one in empty-state)
    // the SearchBox clear button should be hidden via hideClear, so only one button total
    const clearBtns = screen.getAllByRole('button', { name: /Clear search/i });
    expect(clearBtns.length).toBe(1);
    expect(clearBtns[0]).toHaveTextContent(/Clear search/);
  });

  it('regression: API failure preserves header and theme toggle, Retry works', async () => {
    mockFetchFailure(500);
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    // retry succeeds
    mockFetchSuccess(mockRobots);
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => expect(screen.getByText(/loading \.\.\./i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('regression: full happy path API -> team spawn -> edge cases -> verifier', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // API verifier
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // team spawn verifier
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBeGreaterThan(0);
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
    expect(container.querySelector('.pagination')).toBeInTheDocument();
    // edge: search debounced
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Clementine' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('Clementine Bauch')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // edge: favorites filter
    fireEvent.click(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i }));
    expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual([1]);
    // verifier final invariants
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(container.querySelector('.robo-card img')).toHaveAttribute('loading', 'lazy');
  });
});
