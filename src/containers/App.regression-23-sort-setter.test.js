import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}
function mockFetchFailure(status = 500) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) }));
}

describe('regression #23: sort setter hardening for team spawn edge cases (API call -> team spawn -> verifier)', () => {
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

  it('regression: onSortChange hardens corrupt sort values to allowlisted fallback', async () => {
    mockFetchSuccess([{ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' }]);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const appInstance = new App();
    let captured = null;
    appInstance.setState = (updater) => {
      const next = typeof updater === 'function' ? updater(appInstance.state) : updater;
      captured = { ...appInstance.state, ...next };
      appInstance.state = captured;
    };

    appInstance.state.sortBy = 'name';
    appInstance.state.sortDir = 'asc';
    appInstance.onSortChange({ target: { value: 'corrupt:bad' } });
    expect(captured.sortBy).toBe('name');
    expect(captured.sortDir).toBe('asc');
    expect(['name', 'email']).toContain(captured.sortBy);
    expect(['asc', 'desc']).toContain(captured.sortDir);

    appInstance.onSortChange({ target: { value: null } });
    expect(captured.sortBy).toBe('name');
    expect(captured.sortDir).toBe('asc');

    appInstance.onSortChange({ target: { value: '__proto__:desc' } });
    expect(captured.sortBy).toBe('name');
    expect(captured.sortDir).toBe('desc');

    appInstance.onSortChange({ target: { value: 'email:desc' } });
    expect(captured.sortBy).toBe('email');
    expect(captured.sortDir).toBe('desc');

    appInstance.onSortChange({ target: { value: 'name:asc' } });
    expect(captured.sortBy).toBe('name');
    expect(captured.sortDir).toBe('asc');

    expect(() => appInstance.onSortChange(null)).not.toThrow();
    expect(captured.sortBy).toBe('name');
    expect(captured.sortDir).toBe('asc');

    expect(() => appInstance.onSortChange({})).not.toThrow();
    expect(() => appInstance.onSortChange({ target: {} })).not.toThrow();
    expect(() => appInstance.onSortChange({ target: { value: 123 } })).not.toThrow();
    expect(() => appInstance.onSortChange({ target: { value: { toString: () => { throw new Error('bad toString'); } } } })).not.toThrow();

    const select = screen.getByLabelText('Sort by');
    fireEvent.change(select, { target: { value: 'email:desc' } });
    expect(['name:asc', 'name:desc', 'email:asc', 'email:desc']).toContain(select.value);
    const corruptApp = new App();
    corruptApp.state.robots = [{ id: 1, name: 'A', email: 'a@b.com' }];
    corruptApp.state.isLoading = false;
    corruptApp.state.error = null;
    corruptApp.state.sortBy = 'corrupt';
    corruptApp.state.sortDir = 'bad';
    let out;
    expect(() => { out = corruptApp.render(); }).not.toThrow();
    expect(out.props['data-theme']).toMatch(/^(light|dark)$/);
  });

  it('regression: toggleTheme remains safe after corrupt theme and sort edge cases', async () => {
    mockFetchSuccess([{ id: 1, name: 'A', email: 'a@b.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    const toggle = screen.getByTestId('theme-toggle');
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);

    const app = new App();
    let capturedTheme = null;
    app.setState = (updater) => {
      const next = typeof updater === 'function' ? updater(app.state) : updater;
      capturedTheme = { ...app.state, ...next };
      app.state = capturedTheme;
    };
    app.state.theme = 'corrupt';
    app.toggleTheme();
    expect(['light', 'dark']).toContain(capturedTheme.theme);
    app.state.theme = null;
    app.toggleTheme();
    expect(['light', 'dark']).toContain(capturedTheme.theme);
    app.state.theme = {};
    app.toggleTheme();
    expect(['light', 'dark']).toContain(capturedTheme.theme);
  });

  it('full e2e: API call -> team spawn -> edge cases -> verifier happy + failure', async () => {
    mockFetchFailure(500);
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots \(500\)/)).toBeInTheDocument();
    mockFetchSuccess([{ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' }, { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' }]);
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => expect(screen.getByText(/loading \.\.\./i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(document.querySelector('.card-grid')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzzzNotExist' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const select = screen.getByLabelText('Sort by');
    fireEvent.change(select, { target: { value: 'email:asc' } });
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
  });
});
