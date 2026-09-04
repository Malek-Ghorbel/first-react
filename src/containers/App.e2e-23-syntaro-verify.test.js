import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';

const robots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

const success = (data = robots) => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
};

describe('syntaro verify end-to-end #23: API -> team spawn -> edge -> verifier', () => {
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
    success();
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('failure paths: throwing fetch getter does not crash, shows error and keeps verifier', async () => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      get() { throw new Error('getter boom'); },
    });
    let crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots|getter boom/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(document.querySelector('.app-root')).toBeInTheDocument();
  });

  it('edge cases: corrupt state does not crash verifier, retry recovers', async () => {
    localStorage.setItem('robofriends:theme', 'bad');
    localStorage.setItem('robofriends:favorites', 'not-json');
    success();
    const { container, unmount } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    unmount();
    cleanup();
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    try { if (origFetchDesc) Object.defineProperty(global, 'fetch', origFetchDesc); else delete global.fetch; } catch {}
    // after corrupt state, happy path still works
    success([{ id: 9, name: 'Test User', email: 'test@test.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Test User')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('team spawn: favorites, search, pagination, modal and theme toggle work end-to-end', async () => {
    success([
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
    await waitFor(() => expect(container.querySelectorAll('.robo-card').length).toBe(6));
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
