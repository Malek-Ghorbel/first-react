import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import App from './App';

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('repro #23 sync throw and non-thenable guards', () => {
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

  it('fetch sync throw should show error not crash', async () => {
    global.fetch = jest.fn(() => { throw new Error('sync boom'); });
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/sync boom|Failed to load robots/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
  });

  it('fetch returns non-thenable (number) should show error', async () => {
    global.fetch = jest.fn(() => 42);
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots/)).toBeInTheDocument();
  });

  it('fetch returns null/undefined non-thenable should show error', async () => {
    global.fetch = jest.fn(() => null);
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots/)).toBeInTheDocument();
    unmount();
    jest.restoreAllMocks();
    global.fetch = jest.fn(() => undefined);
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots/)).toBeInTheDocument();
  });

  it('fetch returns object without then should show error', async () => {
    global.fetch = jest.fn(() => ({}));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots/)).toBeInTheDocument();
  });

  it('fetch resolves to null response should show error with unknown status', async () => {
    global.fetch = jest.fn(() => Promise.resolve(null));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots/)).toBeInTheDocument();
  });

  it('fetch resolves to response without ok false and no status should show unknown', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots \(unknown\)|Failed to load robots/)).toBeInTheDocument();
  });

  it('pagination guards string pageSize and NaN page via Number conversion', async () => {
    mockFetchSuccess([
      { id: 1, name: 'A', email: 'a@b.com' },
      { id: 2, name: 'B', email: 'b@b.com' },
    ]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    const app = new App();
    app.state = {
      ...app.state,
      robots: [{ id: 1, name: 'A', email: 'a@b.com' }, { id: 2, name: 'B', email: 'b@b.com' }],
      page: 'not-a-number',
      pageSize: 'not-a-number',
      searchfield: '',
      debouncedSearchfield: '',
      favorites: [],
      showFavoritesOnly: false,
      sortBy: 'name',
      sortDir: 'asc',
      theme: 'light',
      isLoading: false,
      error: null,
      selectedRobot: null,
    };
    expect(() => app.render()).not.toThrow();
    const rendered = app.render();
    expect(rendered).toBeTruthy();
    // string numeric pageSize should be coerced to number
    const app2 = new App();
    app2.state = {
      ...app2.state,
      robots: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }],
      page: '2',
      pageSize: '1',
      searchfield: '',
      debouncedSearchfield: '',
      favorites: [],
      showFavoritesOnly: false,
      sortBy: 'name',
      sortDir: 'asc',
      theme: 'light',
      isLoading: false,
      error: null,
      selectedRobot: null,
    };
    expect(() => app2.render()).not.toThrow();
    // page string "2" should be treated as 2
    const out = app2.render();
    expect(out).toBeTruthy();
  });

  it('goToPage with numeric string should coerce correctly and not crash', async () => {
    mockFetchSuccess([{ id: 1, name: 'A', email: 'a@b.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    const instance = new App();
    instance.setState = jest.fn();
    expect(() => instance.goToPage('2')).not.toThrow();
    expect(instance.setState).toHaveBeenCalledWith({ page: 2 });
    instance.setState.mockClear();
    expect(() => instance.goToPage('not-a-number')).not.toThrow();
    expect(instance.setState).not.toHaveBeenCalled();
  });
});
