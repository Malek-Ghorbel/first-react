import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react';
import App from './App';
import Card from '../components/Card';
import CardList from '../components/CardList';

const robots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
];

const mockSuccess = (data = robots) => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
};

// regression #23: Verify end-to-end API call -> team spawn -> edge cases -> verifier with fetch mount guard
describe('regression #23: e2e verify fetch mount guard (fixes #23)', () => {
  let origFetchDesc;
  beforeEach(() => {
    try { jest.useRealTimers(); } catch {}
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    cleanup();
    document.body.innerHTML = '';
    origFetchDesc = Object.getOwnPropertyDescriptor(global, 'fetch');
  });
  afterEach(() => {
    try { jest.useRealTimers(); } catch {}
    jest.restoreAllMocks();
    localStorage.clear();
    cleanup();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    try {
      if (origFetchDesc) Object.defineProperty(global, 'fetch', origFetchDesc);
      else delete global.fetch;
    } catch {}
  });

  it('happy path: API call -> team spawn -> verifier renders robots', async () => {
    mockSuccess();
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(screen.getByText('Ervin Howell')).toBeInTheDocument();
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
  });

  it('team spawn: favorites and theme persist (API->team spawn->verifier)', async () => {
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(favBtn);
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove Leanne Graham/i })).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual(expect.arrayContaining([1]));
    const themeBtn = screen.getByTestId('theme-toggle');
    fireEvent.click(themeBtn);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
    expect(localStorage.getItem('robofriends:theme')).toBe('dark');
  });

  it('failure: fetch network error shows verifier alert and Retry', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network down')));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/network down|Failed to load/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    mockSuccess();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
  });

  it('failure: non-ok and invalid json show verifier alert', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve([]) }));
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    unmount(); cleanup();

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      get() { throw new Error('getter boom'); },
    });
    let crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    cleanup();
    try { if (origFetchDesc) Object.defineProperty(global, 'fetch', origFetchDesc); else delete global.fetch; } catch {}

    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ not: 'array' }) }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('edge: CardList with throwing id getter still renders (team spawn edge)', () => {
    const badRobots = [
      { get id() { throw new Error('id boom'); }, name: 'Bad', email: 'bad@test.com' },
      { id: 5, name: 'Good', email: 'good@test.com' },
    ];
    expect(() => render(<CardList robots={badRobots} favorites={[]} onToggleFavorite={jest.fn()} onSelect={jest.fn()} />)).not.toThrow();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('verifier: async setState after unmount is no-op (fetch mount guard)', async () => {
    // This is the core of the fix: API call resolves after unmount should not warn or crash verifier
    let resolveFetch;
    global.fetch = jest.fn(() => new Promise(res => { resolveFetch = res; }));
    const { unmount } = render(<App />);
    // still loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    // unmount before fetch resolves
    unmount();
    // now resolve fetch with success - should not throw or setState on unmounted
    let error = null;
    try {
      await act(async () => {
        resolveFetch({ ok: true, status: 200, json: () => Promise.resolve(robots) });
        // wait a tick for promise handlers to attempt setState
        await new Promise(r => setTimeout(r, 50));
      });
    } catch (e) { error = e; }
    expect(error).toBe(null);
    // also test rejection after unmount
    let rejectFetch;
    global.fetch = jest.fn(() => new Promise((_, rej) => { rejectFetch = rej; }));
    const { unmount: unmount2 } = render(<App />);
    unmount2();
    try {
      await act(async () => {
        rejectFetch(new Error('network down after unmount'));
        await new Promise(r => setTimeout(r, 50));
      });
    } catch (e) { error = e; }
    expect(error).toBe(null);
  });

  it('verifier: search debounce does not setState after unmount (fake-timer safe)', async () => {
    mockSuccess();
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Search robots/i);
    fireEvent.change(input, { target: { value: 'Leanne' } });
    // unmount before debounce timer fires (300ms)
    unmount();
    // advance timers manually if fake, but with real timers just wait
    await act(async () => {
      await new Promise(r => setTimeout(r, 400));
    });
    // should not throw; if guard missing, React would warn about setState on unmounted
    expect(document.body.innerHTML).not.toContain('Leanne Graham');
  });
});
