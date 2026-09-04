import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}
function mockFetchFailure(status = 500) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) }));
}

describe('verify end-to-end #23: API call -> team spawn -> edge cases -> verifier (full happy + failure)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    cleanup();
    document.body.innerHTML = '';
  });
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    cleanup();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
  });

  it('happy path: API call -> team spawn -> verifier', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // API call verified
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // team spawn verified
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(container.querySelector('.app-header')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBe(3);
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
    // verifier invariants
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    // search still works - wait for debounce (300ms)
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Leanne' } });
    await waitFor(() => expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument(), { timeout: 1000 });
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
  });

  it('failure paths: API errors keep verifier alive and allow retry', async () => {
    // 500
    mockFetchFailure(500);
    const { unmount: u1 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    u1();
    cleanup();
    document.body.innerHTML = '';
    jest.restoreAllMocks();

    // missing fetch
    const origFetch = global.fetch;
    global.fetch = undefined;
    const { unmount: u2 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    u2();
    cleanup();
    document.body.innerHTML = '';
    global.fetch = origFetch;
    jest.restoreAllMocks();

    // sync throw
    global.fetch = jest.fn(() => { throw new Error('sync throw'); });
    const { unmount: u3 } = render(<App />);
    await waitFor(() => expect(screen.getByText(/sync throw|Failed to load/i)).toBeInTheDocument());
    u3();
    cleanup();
    document.body.innerHTML = '';
    jest.restoreAllMocks();

    // non-Error rejection (string)
    global.fetch = jest.fn(() => Promise.reject('string error'));
    const { unmount: u4 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u4();
    cleanup();
    document.body.innerHTML = '';
    jest.restoreAllMocks();

    // null rejection
    global.fetch = jest.fn(() => Promise.reject(null));
    const { unmount: u5 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u5();
    cleanup();
    document.body.innerHTML = '';
    jest.restoreAllMocks();

    // non-thenable
    global.fetch = jest.fn(() => ({ then: null }));
    const { unmount: u6 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u6();
    cleanup();
    document.body.innerHTML = '';
    jest.restoreAllMocks();

    // recovery: success after failures
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('edge cases: corrupt theme, bad sort, throwing getters, invalid robots, bad toString', async () => {
    localStorage.setItem('robofriends:theme', 'corrupt-value');
    localStorage.setItem('robofriends:favorites', 'not-json');
    mockFetchSuccess(mockRobots);
    const { container, unmount } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(container.querySelector('.app-root')).toBeInTheDocument();

    const sortSelect = screen.getByLabelText(/sort by/i);
    fireEvent.change(sortSelect, { target: { value: 'email:desc' } });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const badEvent = { target: { value: { toString() { throw new Error('bad toString'); } } } };
    try {
      fireEvent.change(sortSelect, badEvent);
    } catch {}
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // invalid robots payload - use fresh mount
    unmount();
    cleanup();
    document.body.innerHTML = '';
    localStorage.clear();
    jest.restoreAllMocks();
    mockFetchSuccess([null, undefined, { id: 1, name: 'A', email: 'a@a.com' }, [1,2], { name: 'no id' }, { id: 2, name: { toString() { throw new Error('bad'); } }, email: 'b@b.com' }]);
    const { container: c2, unmount: u2 } = render(<App />);
    await waitFor(() => expect(c2.querySelector('.card-grid')).toBeInTheDocument());
    expect(c2.querySelector('.app-root')).toBeInTheDocument();
    u2();
    cleanup();
    document.body.innerHTML = '';
    localStorage.clear();
    jest.restoreAllMocks();

    mockFetchSuccess(mockRobots);
    const { container: c3 } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const favButtons = c3.querySelectorAll('.favorite-btn');
    if (favButtons.length > 0) {
      fireEvent.click(favButtons[0]);
      await waitFor(() => expect(c3.querySelector('.app-root')).toBeInTheDocument());
    }
    const search = screen.getByRole('searchbox');
    const throwingVal = { toString() { throw new Error('boom'); } };
    try {
      fireEvent.change(search, { target: { value: throwingVal } });
    } catch {}
    await waitFor(() => expect(c3.querySelector('.app-root')).toBeInTheDocument());
  });

  it('team spawn callbacks: favorites, filter, pagination, modal open/close', async () => {
    mockFetchSuccess([
      { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
      { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
      { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
      { id: 4, name: 'Patricia Lebsack', email: 'Julianne.OConner@kory.org' },
      { id: 5, name: 'Chelsey Dietrich', email: 'Lucio_Hettinger@annie.ca' },
      { id: 6, name: 'Mrs. Dennis Schulist', email: 'Karley_Dach@jasper.info' },
      { id: 7, name: 'Kurtis Weissnat', email: 'Telly.Hoeger@billy.biz' },
    ]);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // add favorite - target Leanne explicitly (not first card due to sorting)
    const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(favBtn);
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toBeInTheDocument());

    // toggle filter to show favorites only - should show Leanne
    const favFilterBtn = screen.getByRole('button', { name: /show favorites|showing favorites/i });
    fireEvent.click(favFilterBtn);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(container.querySelectorAll('.robo-card').length).toBe(1);

    // clear filter
    fireEvent.click(favFilterBtn);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // after clearing filter, all cards paginated (6 per page)
    expect(container.querySelectorAll('.robo-card').length).toBe(6);

    // pagination
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    expect(prevBtn).toBeDisabled();
    fireEvent.click(nextBtn);
    await waitFor(() => expect(screen.getByText(/page 2 of/i)).toBeInTheDocument());
    fireEvent.click(prevBtn);
    await waitFor(() => expect(screen.getByText(/page 1 of/i)).toBeInTheDocument());

    // modal open/close - click Leanne's card
    const card = screen.getByLabelText('View details for Leanne Graham');
    fireEvent.click(card);
    await waitFor(() => expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument());

    // theme toggle remains functional
    const themeBtn = screen.getByTestId('theme-toggle');
    const beforeTheme = document.documentElement.getAttribute('data-theme');
    fireEvent.click(themeBtn);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).not.toBe(beforeTheme));
  });
});
