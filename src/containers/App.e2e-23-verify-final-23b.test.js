import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';

const robots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

const mockFetchSuccess = (data = robots) => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
};

describe('verify end-to-end #23 final verifier: API call -> team spawn -> edge cases -> verifier', () => {
  let origFetchDesc;
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    cleanup();
    document.body.innerHTML = '';
    origFetchDesc = Object.getOwnPropertyDescriptor(global, 'fetch');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    cleanup();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    try {
      if (origFetchDesc) Object.defineProperty(global, 'fetch', origFetchDesc);
      else delete global.fetch;
    } catch {}
  });

  it('happy path: API call renders team spawn and verifier invariants', async () => {
    mockFetchSuccess();
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('failure paths: throwing fetch getter, missing fetch, sync throw, non-Error rejection, 500 all keep verifier alive and allow retry', async () => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      get() { throw new Error('getter boom'); },
    });
    let crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots|getter boom/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    cleanup();
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    try { if (origFetchDesc) Object.defineProperty(global, 'fetch', origFetchDesc); else delete global.fetch; } catch {}

    const saved = global.fetch;
    global.fetch = undefined;
    const { unmount: u1 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    u1(); cleanup(); document.body.innerHTML = ''; global.fetch = saved; jest.restoreAllMocks();

    global.fetch = jest.fn(() => { throw new Error('sync throw'); });
    const { unmount: u2 } = render(<App />);
    await waitFor(() => expect(screen.getByText(/sync throw|Failed to load/i)).toBeInTheDocument());
    u2(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    global.fetch = jest.fn(() => Promise.reject('string error'));
    const { unmount: u3 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u3(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    global.fetch = jest.fn(() => Promise.reject(null));
    const { unmount: u4 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u4(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }));
    const { unmount: u5 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u5(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    global.fetch = jest.fn(() => ({ then: null }));
    const { unmount: u6 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    u6(); cleanup(); document.body.innerHTML = ''; jest.restoreAllMocks();

    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('edge cases: corrupt theme/favorites, bad sort, throwing getters, invalid robots, bad toString do not crash verifier', async () => {
    localStorage.setItem('robofriends:theme', 'corrupt-value');
    localStorage.setItem('robofriends:favorites', 'not-json');
    mockFetchSuccess();
    const { container, unmount } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    const sortSelect = screen.getByLabelText(/sort by/i);
    fireEvent.change(sortSelect, { target: { value: 'email:desc' } });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const badEvent = { target: { value: { toString() { throw new Error('bad toString'); } } } };
    try { fireEvent.change(sortSelect, badEvent); } catch {}
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    unmount(); cleanup(); document.body.innerHTML = ''; localStorage.clear(); jest.restoreAllMocks();

    mockFetchSuccess([null, undefined, { id: 1, name: 'A', email: 'a@a.com' }, [1,2], { name: 'no id' }, { id: 2, name: { toString() { throw new Error('bad'); } }, email: 'b@b.com' }]);
    const { container: c2, unmount: u2 } = render(<App />);
    await waitFor(() => expect(c2.querySelector('.card-grid')).toBeInTheDocument());
    expect(c2.querySelector('.app-root')).toBeInTheDocument();
    u2(); cleanup(); document.body.innerHTML = ''; localStorage.clear(); jest.restoreAllMocks();

    mockFetchSuccess();
    const { container: c3 } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const search = screen.getByRole('searchbox');
    const throwingVal = { toString() { throw new Error('boom'); } };
    try { fireEvent.change(search, { target: { value: throwingVal } }); } catch {}
    await waitFor(() => expect(c3.querySelector('.app-root')).toBeInTheDocument());
  });

  it('team spawn: favorites, search, pagination, modal and theme toggle work end-to-end', async () => {
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
    const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(favBtn);
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toBeInTheDocument());
    const filterBtn = screen.getByRole('button', { name: /show favorites|showing favorites/i });
    fireEvent.click(filterBtn);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(container.querySelectorAll('.robo-card').length).toBe(1);
    fireEvent.click(filterBtn);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(container.querySelectorAll('.robo-card').length).toBe(6);
    const card = screen.getByLabelText('View details for Leanne Graham');
    fireEvent.click(card);
    await waitFor(() => expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument());
    const themeBtn = screen.getByTestId('theme-toggle');
    const before = document.documentElement.getAttribute('data-theme');
    fireEvent.click(themeBtn);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).not.toBe(before));
  });
});
