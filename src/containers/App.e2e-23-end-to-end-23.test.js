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

// regression #23: Verify end-to-end API call -> team spawn -> edge cases -> verifier. Full happy path + failure paths.
describe('regression #23: e2e verify API->team spawn->edge->verifier (fixes #23)', () => {
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
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
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

  it('failure: fetch network error shows verifier alert and Retry (failure path)', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network down')));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/network down|Failed to load/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    // Retry should re-invoke fetch
    mockSuccess();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
  });

  it('failure: non-ok, non-thenable, throwing getter, invalid json all show verifier alert', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve([]) }));
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
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

    global.fetch = jest.fn(() => ({ notThen: true }));
    crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    cleanup();

    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ not: 'array' }) }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Invalid data|Failed to load/i)).toBeInTheDocument();
  });

  it('edge: React.createElement / cloneElement with throwing getter does not crash verifier', () => {
    const throwingProps = {};
    Object.defineProperty(throwingProps, 'id', { get() { throw new Error('bomb'); }, enumerable: true, configurable: true });
    throwingProps.name = 'X';
    throwingProps.email = 'x@x.com';
    let el;
    expect(() => { el = React.createElement(Card, throwingProps); }).not.toThrow();
    expect(() => render(el)).not.toThrow();

    mockSuccess();
    // need an App rendered to ensure verifier alive after cloneElement hardening
    const base = React.createElement(Card, { id: 99, name: 'Base', email: 'base@test.com' });
    const cloneProps = {};
    Object.defineProperty(cloneProps, 'name', { get() { throw new Error('clone bomb'); }, enumerable: true, configurable: true });
    let cloned;
    expect(() => { cloned = React.cloneElement(base, cloneProps); }).not.toThrow();
    expect(() => render(cloned)).not.toThrow();
  });

  it('edge: CardList with throwing id getter and corrupt favorites still renders', () => {
    const badRobots = [
      { get id() { throw new Error('id boom'); }, name: 'Bad', email: 'bad@test.com' },
      { id: 5, name: 'Good', email: 'good@test.com' },
    ];
    expect(() => render(<CardList robots={badRobots} favorites={[]} onToggleFavorite={jest.fn()} onSelect={jest.fn()} />)).not.toThrow();
    expect(screen.getByText('Good')).toBeInTheDocument();

    expect(() => render(<CardList robots={[{ id: 1, name: 'A', email: 'a@b.com' }]} favorites={'not-array'} onToggleFavorite={jest.fn()} />)).not.toThrow();
    expect(document.querySelector('.robo-card')).toBeInTheDocument();
  });

  it('verifier: search debounce and clear still work after hardening (fake-timer safe)', async () => {
    try { jest.useRealTimers(); } catch {}
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Search robots/i);
    fireEvent.change(input, { target: { value: 'Leanne' } });
    await waitFor(() => expect(input.value).toBe('Leanne'));
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
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument(), { timeout: 2000 });
  });

  it('verifier: modal open/close and pagination not broken by edge robots', async () => {
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // open modal via Card select
    const card = screen.getByText('Leanne Graham').closest('.robo-card');
    fireEvent.click(card);
    await waitFor(() => expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument());
    // pagination
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });
});
