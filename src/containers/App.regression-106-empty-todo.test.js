import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #106 empty todo shows friendly message', () => {
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

  it('shows All done! Add your first todo above. when todo list is empty (fetch returns [])', async () => {
    mockFetchSuccess([]);
    render(<App />);
    await waitFor(() => expect(screen.getByText(/All done! Add your first todo above\./)).toBeInTheDocument());
    // also keeps No robots found for backward compat
    expect(screen.getByText(/No robots found for/)).toBeInTheDocument();
  });

  it('shows Empty state via CardList when robots prop is empty', async () => {
    const CardList = require('../components/CardList').default;
    render(<CardList robots={[]} favorites={[]} />);
    expect(screen.getByText(/All done! Add your first todo above\./)).toBeInTheDocument();
  });

  it('shows empty-state for CardList with undefined robots (blank area fix)', async () => {
    const CardList = require('../components/CardList').default;
    render(<CardList robots={undefined} favorites={[]} />);
    expect(screen.getByText(/All done! Add your first todo above\./)).toBeInTheDocument();
  });

  it('does not show todo empty when search filters to zero but data exists', async () => {
    const mockRobots = [
      { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
      { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
    ];
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const input = screen.getByRole('searchbox');
    const { fireEvent, act } = require('@testing-library/react');
    fireEvent.change(input, { target: { value: 'zzzqqq' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    // when filtered but not truly empty, todo message should NOT appear
    expect(screen.queryByText(/All done! Add your first todo above\./)).not.toBeInTheDocument();
  });

  it('guards validRobots length throwing edge without crashing', () => {
    const app = new App();
    app.state = {
      ...app.state,
      robots: [],
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
      page: 1,
      pageSize: 6,
    };
    expect(() => app.render()).not.toThrow();
    const out = app.render();
    expect(out).toBeTruthy();
  });
});
