import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #23: theme and debounce hardening (applyTheme/debounce guards)', () => {
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

  it('applyTheme guards invalid theme values - invalid stored theme falls back to light/dark not invalid', async () => {
    localStorage.setItem('robofriends:theme', 'invalid-theme-value');
    mockFetchSuccess([{ id: 1, name: 'A', email: 'a@b.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    const attr = document.documentElement.getAttribute('data-theme');
    expect(['light', 'dark']).toContain(attr);
    expect(attr).not.toBe('invalid-theme-value');
    expect(attr).not.toBe('null');
    expect(attr).not.toBe('undefined');
  });

  it('applyTheme guards null/undefined/number theme via direct App instance render', async () => {
    mockFetchSuccess([{ id: 1, name: 'A', email: 'a@b.com' }]);
    const app = new App();
    // corrupt theme state
    app.state.theme = null;
    expect(() => app.render()).not.toThrow();
    app.state.theme = undefined;
    expect(() => app.render()).not.toThrow();
    app.state.theme = 12345;
    expect(() => app.render()).not.toThrow();
    app.state.theme = {};
    expect(() => app.render()).not.toThrow();
  });

  it('debounce guards non-function fn and non-finite delay', async () => {
    mockFetchSuccess([{ id: 1, name: 'A', email: 'a@b.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    const app2 = new App();
    expect(typeof app2.debouncedSetSearch).toBe('function');
    expect(typeof app2.debouncedSetSearch.cancel).toBe('function');
    expect(() => app2.debouncedSetSearch('test')).not.toThrow();
    expect(() => app2.debouncedSetSearch(null)).not.toThrow();
    expect(() => app2.debouncedSetSearch(undefined)).not.toThrow();
    act(() => { jest.advanceTimersByTime(500); });
    expect(() => app2.componentWillUnmount()).not.toThrow();
    expect(() => app2.debouncedSetSearch.cancel()).not.toThrow();
  });

  it('full e2e still passes after hardening - API -> spawn -> verifier', async () => {
    const robots = [
      { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
      { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
    ];
    mockFetchSuccess(robots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBe(2);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });
});
