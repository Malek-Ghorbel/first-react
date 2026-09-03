import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #23 hardened e2e: API call -> team spawn -> edge cases -> verifier (search/pagination throwing guards)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('happy path: API call spawns team and verifier invariants hold', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBeGreaterThan(0);
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('onSearchChange guards throwing toString (edge case) preserves verifier', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const app = new App();
    app.setState = jest.fn();
    app.debouncedSetSearch = jest.fn();
    const bad = { toString: () => { throw new Error('toString boom'); } };
    expect(() => app.onSearchChange({ target: { value: bad } })).not.toThrow();
    expect(app.setState).toHaveBeenCalledWith({ searchfield: '', page: 1 });
    expect(app.debouncedSetSearch).toHaveBeenCalledWith('');

    // also null/undefined handling still works
    const app2 = new App();
    app2.setState = jest.fn();
    app2.debouncedSetSearch = jest.fn();
    expect(() => app2.onSearchChange({ target: { value: null } })).not.toThrow();
    expect(() => app2.onSearchChange({})).not.toThrow();
    expect(() => app2.onSearchChange(null)).not.toThrow();
    expect(() => app2.onSearchChange(undefined)).not.toThrow();
  });

  it('goToPage guards throwing Number conversion (edge case) preserves verifier', () => {
    const app = new App();
    app.setState = jest.fn();
    const throwing = {
      valueOf() { throw new Error('valueOf boom'); },
      toString() { throw new Error('toString boom'); }
    };
    expect(() => app.goToPage(throwing)).not.toThrow();
    expect(app.setState).not.toHaveBeenCalled();

    const app2 = new App();
    app2.setState = jest.fn();
    // null coerces to 0 -> page 1, so expect a call; undefined and NaN should not trigger setState
    expect(() => app2.goToPage(undefined)).not.toThrow();
    expect(() => app2.goToPage('not-a-number')).not.toThrow();
    expect(app2.setState).not.toHaveBeenCalled();
    const app3 = new App();
    app3.setState = jest.fn();
    expect(() => app3.goToPage(null)).not.toThrow();
    expect(app3.setState).toHaveBeenCalledWith({ page: 1 });
  });

  it('render guards throwing debouncedSearch and throwing robot names (edge cases) do not crash verifier', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // corrupt debouncedSearchfield with throwing toString
    const app = new App();
    app.state = {
      ...app.state,
      robots: mockRobots,
      isLoading: false,
      error: null,
      debouncedSearchfield: { toString: () => { throw new Error('bad toString'); } },
      searchfield: '',
      page: 1,
      pageSize: 6,
      sortBy: 'name',
      sortDir: 'asc',
      favorites: [],
      showFavoritesOnly: false,
      theme: 'light',
    };
    expect(() => app.render()).not.toThrow();
    const out = app.render();
    expect(out.props['data-theme']).toMatch(/^(light|dark)$/);

    // robot with throwing name
    const throwingRobot = { id: 99, name: { toString: () => { throw new Error('bad'); } }, email: 'test@test.com' };
    const app2 = new App();
    app2.state = {
      ...app2.state,
      robots: [...mockRobots, throwingRobot],
      isLoading: false,
      error: null,
      debouncedSearchfield: '',
      searchfield: '',
      page: 1,
      pageSize: 20,
      sortBy: 'name',
      sortDir: 'asc',
      favorites: [],
      showFavoritesOnly: false,
      theme: 'dark',
    };
    expect(() => app2.render()).not.toThrow();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
  });

  it('render guards throwing pageSize and currentPage (edge cases) do not crash verifier', () => {
    const throwing = { valueOf() { throw new Error('boom'); } };
    const app = new App();
    app.state = {
      ...app.state,
      robots: mockRobots,
      isLoading: false,
      error: null,
      debouncedSearchfield: '',
      searchfield: '',
      page: throwing,
      pageSize: throwing,
      sortBy: 'name',
      sortDir: 'asc',
      favorites: [],
      showFavoritesOnly: false,
      theme: 'light',
    };
    expect(() => app.render()).not.toThrow();
    const out = app.render();
    expect(out.props['data-theme']).toMatch(/^(light|dark)$/);
  });

  it('full e2e: API -> team spawn -> edge cases -> verifier remains intact', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // team spawn verifier
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();

    // edge: corrupt theme via direct state and toggle still works
    const themeBtn = screen.getByTestId('theme-toggle');
    fireEvent.click(themeBtn);
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);

    // edge: search with throwing object via handler should not crash, verifier header remains
    const app = new App();
    app.setState = jest.fn();
    app.debouncedSetSearch = jest.fn();
    expect(() => app.onSearchChange({ target: { value: { toString: () => { throw new Error('x'); } } } })).not.toThrow();

    // verifier final
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });
});
