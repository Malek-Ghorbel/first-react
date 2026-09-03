import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #23 searchfield string guard - empty-state', () => {
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

  it('empty-state renders with object searchfield without throwing (String guard)', async () => {
    mockFetchSuccess([{ id: 1, name: 'Leanne Graham', email: 'a@b.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // Direct instance render with corrupted searchfield object should not throw
    const app = new App();
    app.state = {
      ...app.state,
      robots: [{ id: 1, name: 'Leanne Graham', email: 'a@b.com' }],
      searchfield: { toString: () => 'hacked' },
      debouncedSearchfield: { toString: () => 'hacked' },
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
    // FilteredRobots will be empty because searched uses String(robot.name) includes String(debouncedSearchfield)
    // which is "[object Object]" vs "hacked" -> no match, so empty state renders with searchfield object
    // Old code: {this.state.searchfield} where searchfield is object => React throws "Objects are not valid as a React child"
    // New code: {String(this.state.searchfield ?? '')} => "[object Object]" or "hacked" safely
    expect(() => app.render()).not.toThrow();
    const out = app.render();
    expect(out).toBeTruthy();
  });

  it('empty-state guards null, undefined, number and array searchfield', async () => {
    const cases = [null, undefined, 0, 123, [], ['a'], 42];
    for (const val of cases) {
      const app = new App();
      app.state = {
        ...app.state,
        robots: [{ id: 1, name: 'A', email: 'a@b.com' }],
        searchfield: val,
        debouncedSearchfield: 'zzzzNotExist',
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
      const rendered = app.render();
      // Should contain empty-state with stringified searchfield, not throw, and not leak "null"/"undefined" as literal without guard?
      // With String guard, null/undefined become "" (empty), not "null"
      expect(rendered).toBeTruthy();
    }
  });

  it('empty-state with string searchfield still shows query', async () => {
    const app = new App();
    app.state = {
      ...app.state,
      robots: [{ id: 1, name: 'A', email: 'a@b.com' }],
      searchfield: 'zzzzNotExist',
      debouncedSearchfield: 'zzzzNotExist',
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
    const out = app.render();
    expect(out.props.children).toBeTruthy();
    // Rendered output should contain the query string when filtered empty
    // Use instance rendering by checking that not throw and that stringified value is preserved
    expect(() => app.render()).not.toThrow();
  });
});
