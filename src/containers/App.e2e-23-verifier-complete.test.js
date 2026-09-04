import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react';
import App from './App';

const robots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
];

const mockSuccess = (data = robots) => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
};

// regression #23: Verify end-to-end API call -> team spawn -> edge cases -> verifier. Full happy path + failure paths.
// This test reproduces the bug where a throwing `then` getter on the fetch result would crash the verifier
// instead of showing a graceful error, and verifies the complete happy/edge/failure matrix after hardening.
describe('regression #23: e2e verifier complete API->team spawn->edge->verifier (fixes #23)', () => {
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
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('team spawn: favorites, search debounce, theme persist work end-to-end', async () => {
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(favBtn);
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove Leanne Graham/i })).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual(expect.arrayContaining([1]));
    const input = screen.getByPlaceholderText(/Search robots/i);
    fireEvent.change(input, { target: { value: 'Leanne' } });
    await waitFor(() => expect(input.value).toBe('Leanne'));
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
    await waitFor(() => expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    const clearBtn = screen.getByTestId('search-clear-btn');
    fireEvent.click(clearBtn);
    await waitFor(() => expect(input.value).toBe(''));
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument(), { timeout: 2000 });
    const themeBtn = screen.getByTestId('theme-toggle');
    const before = document.documentElement.getAttribute('data-theme');
    fireEvent.click(themeBtn);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).not.toBe(before));
    expect(localStorage.getItem('robofriends:theme')).toMatch(/^(light|dark)$/);
  });

  it('failure: throwing then getter on fetch result does not crash verifier (hardened)', async () => {
    global.fetch = jest.fn(() => ({
      get then() { throw new Error('then boom'); },
    }));
    let crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    cleanup();
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    try { if (origFetchDesc) Object.defineProperty(global, 'fetch', origFetchDesc); else delete global.fetch; } catch {}

    // non-thenable object with then not function
    global.fetch = jest.fn(() => ({ then: 'not-a-function' }));
    const { unmount: u1 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u1(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    // throwing fetch getter
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      get() { throw new Error('getter boom'); },
    });
    let crashed2 = false;
    try { render(<App />); } catch { crashed2 = true; }
    expect(crashed2).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    cleanup(); document.body.innerHTML = '';
    try { if (origFetchDesc) Object.defineProperty(global, 'fetch', origFetchDesc); else delete global.fetch; } catch {}
    jest.restoreAllMocks();

    // missing fetch
    const saved = global.fetch;
    try { delete global.fetch; } catch { global.fetch = undefined; }
    if (typeof global.fetch !== 'undefined') global.fetch = undefined;
    const { unmount: u2 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u2(); cleanup(); document.body.innerHTML = ''; global.fetch = saved; jest.restoreAllMocks();

    // sync throw
    global.fetch = jest.fn(() => { throw new Error('sync throw'); });
    const { unmount: u3 } = render(<App />);
    await waitFor(() => expect(screen.getByText(/sync throw|Failed to load/i)).toBeInTheDocument());
    u3(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    // string rejection
    global.fetch = jest.fn(() => Promise.reject('string error'));
    const { unmount: u4 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/string error|Failed to load/i)).toBeInTheDocument();
    u4(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    // null rejection
    global.fetch = jest.fn(() => Promise.reject(null));
    const { unmount: u5 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u5(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    // 500
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }));
    const { unmount: u6 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u6(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    // invalid json shape (non-array)
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ not: 'array' }) }));
    const { unmount: u7 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u7(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    // recovery happy path again
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('edge: corrupt theme/favorites, bad robots, throwing getters do not crash verifier', async () => {
    localStorage.setItem('robofriends:theme', 'corrupt-value');
    localStorage.setItem('robofriends:favorites', 'not-json');
    mockSuccess();
    const { container, unmount } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    unmount(); cleanup(); document.body.innerHTML = ''; localStorage.clear(); jest.restoreAllMocks();

    mockSuccess([null, undefined, { id: 1, name: 'A', email: 'a@a.com' }, [1, 2], { name: 'no id' }]);
    const { container: c2, unmount: u2 } = render(<App />);
    await waitFor(() => expect(c2.querySelector('.card-grid')).toBeInTheDocument());
    expect(c2.querySelector('.app-root')).toBeInTheDocument();
    u2(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    mockSuccess();
    const { container: c3 } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const search = screen.getByRole('searchbox');
    const throwingVal = { toString() { throw new Error('boom'); } };
    try { fireEvent.change(search, { target: { value: throwingVal } }); } catch {}
    await waitFor(() => expect(c3.querySelector('.app-root')).toBeInTheDocument());
  });

  it('verifier: API call -> team spawn -> edge -> verifier all guards keep UI alive', async () => {
    const origGlobalThisFetch = typeof globalThis !== 'undefined' ? globalThis.fetch : undefined;
    try { delete global.fetch; } catch { global.fetch = undefined; }
    if (typeof globalThis !== 'undefined') {
      globalThis.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(robots) }));
    }
    let crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument(), { timeout: 3000 });
    cleanup(); document.body.innerHTML = '';
    if (typeof globalThis !== 'undefined') {
      if (origGlobalThisFetch) globalThis.fetch = origGlobalThisFetch;
      else try { delete globalThis.fetch; } catch {}
    }
    try { if (origFetchDesc) Object.defineProperty(global, 'fetch', origFetchDesc); else delete global.fetch; } catch {}
    jest.restoreAllMocks();
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });
});
