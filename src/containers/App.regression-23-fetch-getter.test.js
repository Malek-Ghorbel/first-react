import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import App from './App';

describe('regression #23: API call -> team spawn -> throwing fetch getter -> verifier', () => {
  let originalDescriptor;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    cleanup();
    document.body.innerHTML = '';
    // save original fetch descriptor
    originalDescriptor = Object.getOwnPropertyDescriptor(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    cleanup();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    // restore fetch
    try {
      if (originalDescriptor) {
        Object.defineProperty(global, 'fetch', originalDescriptor);
      } else {
        delete global.fetch;
      }
    } catch {}
  });

  it('fetch defined as throwing getter should show error not crash (edge case -> verifier)', async () => {
    // team spawn edge case: fetch is defined as throwing getter (API call -> verifier)
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      get() { throw new Error('getter boom'); }
    });
    let crashed = false;
    try {
      render(<App />);
    } catch (e) {
      crashed = true;
    }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText(/Failed to load robots|getter boom/i)).toBeInTheDocument();
    // verifier invariants still hold
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(document.querySelector('.app-root')).toBeInTheDocument();
  });

  it('happy path after restoring fetch still works (verifier recovery)', async () => {
    // restore first
    try {
      if (originalDescriptor) {
        Object.defineProperty(global, 'fetch', originalDescriptor);
      } else {
        delete global.fetch;
      }
    } catch {}
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' }]) }));
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('full e2e: throwing getter -> failure path -> retry with success preserves team spawn', async () => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      get() { throw new Error('throwing getter'); }
    });
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    unmount();
    cleanup();
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    try {
      if (originalDescriptor) {
        Object.defineProperty(global, 'fetch', originalDescriptor);
      } else {
        delete global.fetch;
      }
    } catch {}
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' }]) }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
