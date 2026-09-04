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

describe('regression #23: e2e continuity API->team spawn->edge->verifier (fixes #23)', () => {
  let origFetchDesc;
  beforeEach(() => {
    // e2e verifier: ensure real timers for debounce (previous suites may leak fake timers) -> API call -> team spawn -> verifier
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

  it('happy path: API call -> renders robots and verifier finds them', async () => {
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(screen.getByText('Ervin Howell')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('team spawn: favorites toggle and theme persist (API call -> team spawn -> verifier)', async () => {
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
  });

  it('failure: fetch non-ok response shows verifier alert', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve([]) }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
  });

  it('failure: throwing fetch getter does not crash verifier (team spawn edge)', async () => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      get() { throw new Error('getter boom'); },
    });
    let crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('failure: fetch returns non-thenable does not crash verifier', async () => {
    global.fetch = jest.fn(() => ({ notThen: true }));
    let crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('edge: React.createElement with throwing getter does not throw (verifier guard)', () => {
    const throwingProps = {};
    Object.defineProperty(throwingProps, 'id', { get() { throw new Error('bomb'); }, enumerable: true, configurable: true });
    throwingProps.name = 'X';
    throwingProps.email = 'x@x.com';
    let el;
    expect(() => { el = React.createElement(Card, throwingProps); }).not.toThrow();
    expect(() => render(el)).not.toThrow();
  });

  it('edge: React.cloneElement with throwing getter does not throw', () => {
    const base = React.createElement(Card, { id: 99, name: 'Base', email: 'base@test.com' });
    const cloneProps = {};
    Object.defineProperty(cloneProps, 'name', { get() { throw new Error('clone bomb'); }, enumerable: true, configurable: true });
    cloneProps.email = 'cloned@test.com';
    let cloned;
    expect(() => { cloned = React.cloneElement(base, cloneProps); }).not.toThrow();
    expect(() => render(cloned)).not.toThrow();
  });

  it('edge: cloneElement null returns null and ownKeys throwing recovers', () => {
    let result;
    expect(() => { result = React.cloneElement(null, { foo: 'bar' }); }).not.toThrow();
    expect(result).toBeNull();
    const origOwnKeys = Reflect.ownKeys;
    Reflect.ownKeys = () => { throw new Error('reflect boom'); };
    try {
      const props = { id: 2, name: 'B', email: 'b@b.com' };
      let el;
      expect(() => { el = React.createElement(Card, props); }).not.toThrow();
      expect(el).toBeDefined();
    } finally {
      Reflect.ownKeys = origOwnKeys;
    }
  });

  it('verifier: search debounce and clear still work after hardening', async () => {
    // ensure real timers for debounce - guard against fake-timer leakage from other suites (API call -> team spawn -> edge -> verifier)
    try { jest.useRealTimers(); } catch {}
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Search robots/i);
    fireEvent.change(input, { target: { value: 'Leanne' } });
    await waitFor(() => expect(input.value).toBe('Leanne'));
    // debounced filter eventually applied (debounce 300ms) - allow real timer to fire (API call -> team spawn -> verifier)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    await waitFor(() => expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    const clearBtn = screen.getByTestId('search-clear-btn');
    fireEvent.click(clearBtn);
    await waitFor(() => expect(input.value).toBe(''));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    // after clear, both robots re-appear (debounced clear)
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument(), { timeout: 2000 });
  });

  it('edge: CardList with throwing id getters still renders (team spawn)', () => {
    const badRobots = [
      { get id() { throw new Error('id boom'); }, name: 'Bad', email: 'bad@test.com' },
      { id: 5, name: 'Good', email: 'good@test.com' },
    ];
    let err = null;
    try {
      render(<CardList robots={badRobots} favorites={[]} onToggleFavorite={() => {}} onSelect={() => {}} />);
    } catch (e) { err = e; }
    expect(err).toBeNull();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });
});
