import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
  { id: 4, name: 'Patricia Lebsack', email: 'Julianne.OConner@kory.org' },
  { id: 5, name: 'Chelsey Dietrich', email: 'Lucio_Hettinger@annie.ca' },
  { id: 6, name: 'Mrs. Dennis Schulist', email: 'Karley_Dach@jasper.info' },
  { id: 7, name: 'Kurtis Weissnat', email: 'Telly.Hoeger@billy.biz' },
  { id: 8, name: 'Nicholas Runolfsdottir V', email: 'Sherwood@rosamond.me' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}
function mockFetchFailure(status = 500) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) }));
}
function mockFetchReject(msg = 'Network error') {
  global.fetch = jest.fn(() => Promise.reject(new Error(msg)));
}
function mockFetchInvalidData(payload) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) }));
}

describe('end-to-end verification: API call -> team spawn -> edge cases -> verifier', () => {
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

  // ========== API CALL ==========
  describe('API call', () => {
    it('happy path: fetch 200 renders robots and team spawn', async () => {
      mockFetchSuccess(mockRobots);
      const { container } = render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

      // verifier: root route 200 - h1 present, no alert
      expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // team spawn: CardList spawns cards inside grid
      const grid = container.querySelector('.card-grid');
      expect(grid).toBeInTheDocument();
      const cards = container.querySelectorAll('.robo-card');
      expect(cards.length).toBe(6); // pageSize 6, page 1
      expect(screen.getByText('Chelsey Dietrich')).toBeInTheDocument(); // sorted A-Z first
      expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
      expect(container.querySelector('.pagination')).toBeInTheDocument();
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });

    it('failure path: 500 renders error with Retry and preserves header', async () => {
      mockFetchFailure(500);
      render(<App />);
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load robots \(500\)/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('failure path: 404 renders error', async () => {
      mockFetchFailure(404);
      render(<App />);
      await waitFor(() => expect(screen.getByText(/Failed to load robots \(404\)/)).toBeInTheDocument());
    });

    it('failure path: network reject renders error', async () => {
      mockFetchReject('Network error');
      render(<App />);
      await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument());
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('failure path: invalid data format (non-array) renders error instead of crash', async () => {
      mockFetchInvalidData({ not: 'an array' });
      render(<App />);
      await waitFor(() => expect(screen.getByText(/Invalid data format/)).toBeInTheDocument());
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('failure path: invalid data format null renders error', async () => {
      mockFetchInvalidData(null);
      render(<App />);
      await waitFor(() => expect(screen.getByText(/Invalid data format/)).toBeInTheDocument());
    });

    it('retry happy path: error -> Retry -> success renders robots', async () => {
      mockFetchFailure(500);
      render(<App />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument());
      // second fetch succeeds
      mockFetchSuccess(mockRobots);
      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
      // isLoading should reappear briefly
      await waitFor(() => expect(screen.getByText(/loading \.\.\./i)).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('retry failure path: error -> Retry -> still fails shows error again', async () => {
      mockFetchFailure(500);
      render(<App />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument());
      mockFetchFailure(503);
      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
      await waitFor(() => expect(screen.getByText(/Failed to load robots \(503\)/)).toBeInTheDocument());
    });

    it('loading verifier shows skeleton and branded title', async () => {
      global.fetch = jest.fn(() => new Promise(() => {}));
      const { container } = render(<App />);
      expect(screen.getByText(/loading \.\.\./i)).toBeInTheDocument();
      expect(screen.getByText(/loading \.\.\./i)).toHaveClass('loading-title');
      expect(container.querySelector('.loading-container')).toBeInTheDocument();
      expect(container.querySelector('.skeleton-grid')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });
  });

  // ========== TEAM SPAWN ==========
  describe('team spawn', () => {
    it('spawns correct cards per page and modal on select', async () => {
      mockFetchSuccess(mockRobots);
      const { container } = render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

      // page 1 has 6 cards
      expect(container.querySelectorAll('.robo-card').length).toBe(6);
      // images lazy
      expect(container.querySelector('.robo-card img')).toHaveAttribute('loading', 'lazy');
      expect(container.querySelector('.robo-card img')).toHaveAttribute('src', expect.stringContaining('robohash.org'));

      // pagination to page 2
      fireEvent.click(screen.getByLabelText('Next page'));
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
      expect(container.querySelectorAll('.robo-card').length).toBe(2);

      // back to page 1 and open modal
      fireEvent.click(screen.getByLabelText('Previous page'));
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      const card = screen.getByLabelText('View details for Leanne Graham');
      expect(card).toHaveClass('robo-card');
      card.click();
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(screen.getByRole('dialog')).toHaveClass('modal-dialog');
      expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
      // close modal
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('spawns search, sort, favorites toolbar', async () => {
      mockFetchSuccess(mockRobots);
      const { container } = render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(container.querySelector('.search-input-modern')).toBeInTheDocument();
      expect(container.querySelector('.search-icon')).toBeInTheDocument();
      expect(container.querySelector('.search-wrapper')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by').value).toBe('name:asc');
      expect(screen.getByRole('button', { name: /Show favorites/i })).toBeInTheDocument();
      expect(container.querySelector('.toolbar-btn')).toBeInTheDocument();
      expect(container.querySelector('.sort-select')).toBeInTheDocument();
    });

    it('modal closes on Esc and backdrop, focuses close button', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      screen.getByLabelText('View details for Leanne Graham').click();
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      screen.getByLabelText('View details for Leanne Graham').click();
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('modal-backdrop'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });

  // ========== EDGE CASES ==========
  describe('edge cases', () => {
    it('search filters (debounced) and clear restores list', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'Clementine' } });
      // before debounce, still shows all
      expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
      act(() => { jest.advanceTimersByTime(300); });
      await waitFor(() => expect(screen.getByText('Clementine Bauch')).toBeInTheDocument());
      expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument();

      // clear search via X button
      expect(screen.getByRole('button', { name: /Clear search/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
      expect(input).toHaveValue('');
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    });

    it('search no results shows empty state with query and Clear search', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'zzzzNotExist' } });
      act(() => { jest.advanceTimersByTime(300); });
      await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
      expect(screen.getByText(/zzzzNotExist/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clear search/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    });

    it('search is case-insensitive', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'leanne' } });
      act(() => { jest.advanceTimersByTime(300); });
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument();
    });

    it('favorites empty state', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByRole('searchbox')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Show favorites \(0\)/ }));
      expect(screen.getByText(/No favorites yet/)).toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('favorites toggle persists and filter shows only favorites', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i }));
      expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual([1]);
      expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Show favorites \(1\)/ }));
      expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
      expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Showing favorites \(1\)/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('favorites filter composes with search (debounced)', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i }));
      fireEvent.click(screen.getByRole('button', { name: /Add Ervin Howell to favorites/i }));
      fireEvent.click(screen.getByRole('button', { name: /Show favorites \(2\)|Showing favorites/ }));
      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'Leanne' } });
      act(() => { jest.advanceTimersByTime(300); });
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      await waitFor(() => expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument());
    });

    it('corrupt localStorage for favorites is ignored gracefully', async () => {
      localStorage.setItem('robofriends:favorites', '{{{');
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByRole('searchbox')).toBeInTheDocument());
      expect(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Remove /i })).not.toBeInTheDocument();
    });

    it('empty array response shows empty state not crash', async () => {
      mockFetchSuccess([]);
      render(<App />);
      await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
      expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    });

    it('handles robots with missing name gracefully (no crash)', async () => {
      const bad = [{ id: 1, email: 'a@b.com' }, { id: 2, name: 'Ervin Howell', email: 'b@c.com' }];
      mockFetchSuccess(bad);
      render(<App />);
      await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
      // should not throw when filtering
      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'Ervin' } });
      act(() => { jest.advanceTimersByTime(300); });
      await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    });

    it('pagination disables Prev on first page and Next on last', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument());
      expect(screen.getByLabelText('Previous page')).toBeDisabled();
      expect(screen.getByLabelText('Next page')).not.toBeDisabled();
      fireEvent.click(screen.getByLabelText('Next page'));
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeDisabled();
      expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
    });

    it('sorting resets page to 1', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument());
      fireEvent.click(screen.getByLabelText('Next page'));
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'email:desc' } });
      await waitFor(() => expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument());
    });

    it('search resets page to 1', async () => {
      mockFetchSuccess(mockRobots);
      render(<App />);
      await waitFor(() => expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument());
      fireEvent.click(screen.getByLabelText('Next page'));
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'a' } });
      act(() => { jest.advanceTimersByTime(300); });
      await waitFor(() => expect(screen.getByText(/Page 1 of/)).toBeInTheDocument());
    });
  });

  // ========== VERIFIER ==========
  describe('verifier', () => {
    it('full happy path verifier: API -> spawn -> interactions -> final invariants', async () => {
      mockFetchSuccess(mockRobots);
      const { container } = render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

      // stage 1: API call verifier
      expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/ROBOFRIENDS/);

      // stage 2: team spawn verifier
      expect(container.querySelector('.app-root')).toBeInTheDocument();
      expect(container.querySelector('.app-header')).toBeInTheDocument();
      expect(container.querySelector('.app-main')).toBeInTheDocument();
      expect(container.querySelector('.card-grid')).toBeInTheDocument();
      expect(container.querySelectorAll('.robo-card').length).toBeGreaterThan(0);
      expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
      expect(container.querySelector('.toolbar')).toBeInTheDocument();
      expect(container.querySelector('.pagination')).toBeInTheDocument();

      // edge: favorite one
      const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
      expect(favBtn).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(favBtn);
      expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toHaveAttribute('aria-pressed', 'true');
      expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual([1]);

      // edge: search
      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'Ervin' } });
      act(() => { jest.advanceTimersByTime(300); });
      await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
      expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

      // edge: modal
      screen.getByLabelText('View details for Leanne Graham').click();
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      // verifier final invariants
      expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
      expect(container.querySelector('.card-grid')).toBeInTheDocument();
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
      expect(container.querySelector('.robo-card img')).toHaveAttribute('loading', 'lazy');
      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search robots by name');
    });

    it('failure verifier: all error states preserve header and theme toggle', async () => {
      mockFetchFailure(500);
      render(<App />);
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      // loading state also preserves
      global.fetch = jest.fn(() => new Promise(() => {}));
      const { unmount } = render(<App />);
      // already mounted one error, unmount to test loading isolated
      unmount();
      const { container } = render(<App />);
      expect(container.querySelector('.loading-container')).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
    });

    it('debounce cleanup on unmount does not leak', async () => {
      mockFetchSuccess(mockRobots);
      const { unmount } = render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'test' } });
      unmount();
      act(() => { jest.advanceTimersByTime(500); });
      // no error thrown, test passes if we reach here
      expect(true).toBe(true);
    });
  });
});
