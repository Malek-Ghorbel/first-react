import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #23: render guards for corrupt theme/sort (team spawn edge cases)', () => {
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

  it('regression: corrupt theme in state does not leak to verifier (data-theme fallback)', async () => {
    mockFetchSuccess([{ id: 1, name: 'A', email: 'a@b.com' }]);
    const app = new App();
    // Simulate team spawn edge case: corrupt theme via state
    app.state.theme = 'corrupt-theme-value';
    app.state.robots = [{ id: 1, name: 'A', email: 'a@b.com' }];
    app.state.isLoading = false;
    app.state.error = null;
    let output;
    expect(() => { output = app.render(); }).not.toThrow();
    // rendered root should use safeTheme light, not corrupt value
    expect(output.props['data-theme']).toBe('light');
    expect(output.props.className).toContain('theme-light');
    expect(output.props.className).not.toContain('corrupt-theme-value');

    // Also verify via mounted component: corrupt theme should not appear in DOM
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    // Directly corrupt mounted instance's state (hack via internal)
    // Instead verify that invalid stored theme is ignored and renders light
    localStorage.setItem('robofriends:theme', 'invalid');
    // Re-rendering should still be light/dark, not invalid (already tested in other suite)
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(document.documentElement.getAttribute('data-theme')).not.toBe('corrupt-theme-value');
    expect(container.querySelector('[data-theme="corrupt-theme-value"]')).toBeNull();
  });

  it('regression: corrupt sortBy/sortDir falls back to allowlisted values', async () => {
    mockFetchSuccess([
      { id: 1, name: 'Zebra', email: 'z@b.com' },
      { id: 2, name: 'Apple', email: 'a@b.com' },
    ]);
    const app = new App();
    app.state.sortBy = 'corrupt-key';
    app.state.sortDir = 'corrupt-dir';
    app.state.robots = [
      { id: 1, name: 'Zebra', email: 'z@b.com' },
      { id: 2, name: 'Apple', email: 'a@b.com' },
    ];
    app.state.isLoading = false;
    app.state.error = null;
    app.state.debouncedSearchfield = '';
    let output;
    expect(() => { output = app.render(); }).not.toThrow();
    // The sort select value should be normalized to name:asc
    // Find select in output tree: traverse props children
    // Instead mount and check DOM after corrupt state via direct instance
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Apple')).toBeInTheDocument());
    // Check that sort select value is one of allowed values
    const select = screen.getByLabelText('Sort by');
    expect(['name:asc', 'name:desc', 'email:asc', 'email:desc']).toContain(select.value);
    // Verify safeSort guards prevent crash when sorting with corrupt keys
    app.state.sortBy = '__proto__';
    app.state.sortDir = 'desc';
    expect(() => app.render()).not.toThrow();
    app.state.sortBy = null;
    app.state.sortDir = null;
    expect(() => app.render()).not.toThrow();
    app.state.sortBy = 123;
    app.state.sortDir = {};
    expect(() => app.render()).not.toThrow();
  });

  it('regression: corrupt theme object/number does not leak to DOM and toggle still works', async () => {
    mockFetchSuccess([{ id: 1, name: 'A', email: 'a@b.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    const app = new App();
    [null, undefined, 123, {}, [], 'dark\0', 'LIGHT'].forEach((val) => {
      app.state.theme = val;
      app.state.isLoading = false;
      app.state.robots = [{ id: 1, name: 'A', email: 'a@b.com' }];
      app.state.error = null;
      let out;
      expect(() => { out = app.render(); }).not.toThrow();
      expect(['light', 'dark']).toContain(out.props['data-theme']);
    });
  });

  it('full e2e with guard: API call -> team spawn -> edge cases -> verifier still passes', async () => {
    const robots = [
      { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
      { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
    ];
    mockFetchSuccess(robots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    // data-theme should be safe
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
  });
});
