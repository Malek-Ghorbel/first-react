import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
import CardList from '../components/CardList';

const mockRobotsNumeric = [
  { id: 1, name: 12345, email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 67890 },
  { id: 3, name: null, email: null },
  { id: 4, name: 'Patricia Lebsack', email: 'Julianne.OConner@kory.org' },
];

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('hardening edge #23b: non-string values and corrupt favorites', () => {
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

  it('CardList guards favorites non-array without crashing', () => {
    const robots = [{ id: 1, name: 'A', email: 'a@b.com' }];
    const { container } = render(<CardList robots={robots} favorites={'not-an-array'} onToggleFavorite={() => {}} onSelect={() => {}} />);
    expect(container.querySelector('.robo-card')).toBeInTheDocument();
    // string favorites should not mark as favorite (Array.isArray guard)
    expect(container.querySelector('.favorite-active')).not.toBeInTheDocument();
  });

  it('CardList guards favorites number and null', () => {
    const robots = [{ id: 1, name: 'A', email: 'a@b.com' }];
    const { container: c1 } = render(<CardList robots={robots} favorites={null} onToggleFavorite={() => {}} />);
    expect(c1.querySelector('.robo-card')).toBeInTheDocument();
    const { container: c2 } = render(<CardList robots={robots} favorites={123} onToggleFavorite={() => {}} />);
    expect(c2.querySelector('.robo-card')).toBeInTheDocument();
    const { container: c3 } = render(<CardList robots={robots} favorites={{}} onToggleFavorite={() => {}} />);
    expect(c3.querySelector('.robo-card')).toBeInTheDocument();
  });

  it('App search and sort handle numeric name/email without throwing', async () => {
    mockFetchSuccess(mockRobotsNumeric);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    // search for numeric name string should not crash
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: '123' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('12345')).toBeInTheDocument());
    // clear
    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    // sort by name should not crash with numeric names
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name:desc' } });
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    // sort by email with numeric email
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'email:asc' } });
    await waitFor(() => expect(screen.getByText('Ervin Howell')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('App toggleFavorite guards corrupted favorites array', async () => {
    mockFetchSuccess([{ id: 1, name: 'Leanne Graham', email: 'a@b.com' }]);
    // corrupt localStorage with non-array
    localStorage.setItem('robofriends:favorites', JSON.stringify({ not: 'array' }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // favorites should be ignored and treated as []
    expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual({ not: 'array' }); // initial still corrupt before componentDidMount correct? Actually component ignores non-array, so state stays []
    // clicking favorite should not throw even though prev favorites was corrupted
    const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(favBtn);
    expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual([1]);
    expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toBeInTheDocument();
  });

  it('App handles robots with missing id filtered by CardList', async () => {
    mockFetchSuccess([{ name: 'NoId', email: 'noid@test.com' }, { id: 2, name: 'HasId', email: 'has@test.com' }]);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('HasId')).toBeInTheDocument());
    expect(screen.queryByText('NoId')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBe(1);
  });
});
