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
function mockFetchFailure(status = 500) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) }));
}

describe('regression #23: API call -> team spawn -> edge cases -> verifier (happy + failure)', () => {
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

  it('happy path: API call succeeds -> team spawn renders -> verifier sees header/grid/theme', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await act(async () => { jest.advanceTimersByTime(0); });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('failure paths: fetch 500 -> error UI with retry, then retry succeeds', async () => {
    mockFetchFailure(500);
    render(<App />);
    await act(async () => { jest.advanceTimersByTime(0); });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();

    // retry happy
    mockFetchSuccess(mockRobots);
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await act(async () => { jest.advanceTimersByTime(0); });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('edge cases: Scroll and ErrorBoundary guard throwing children/props without crashing verifier', async () => {
    const throwingChildren = {
      get children() { throw new Error('throwing getter'); }
    };
    // Directly verify Scroll/ErrorBoundary don't crash on corrupt props - via App integration with corrupt robots
    mockFetchSuccess([
      { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
      { get id() { throw new Error('id throw'); }, name: 'Bad Robot', email: 'bad@test.com' },
      null,
      { id: 2, name: { toString() { throw new Error('toString throw'); } }, email: 'ok@test.com' },
    ]);
    const { container } = render(<App />);
    await act(async () => { jest.advanceTimersByTime(0); });
    // verifier should still see header and not crash
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument());
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    // Scroll should be present even with edge robots
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
  });

  it('verifier: search debounce and favorites filter remain functional after API success', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await act(async () => { jest.advanceTimersByTime(0); });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // search debounce
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Clementine' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('Clementine Bauch')).toBeInTheDocument());

    // favorites
    const favButtons = screen.getAllByRole('button', { name: /Add .* to favorites|Remove .* from favorites/ });
    fireEvent.click(favButtons[0]);
    // toolbar should show count
    expect(screen.getByText(/Show favorites|Showing favorites/)).toBeInTheDocument();
  });
});
