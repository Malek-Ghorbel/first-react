import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #96 search matches email', () => {
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

  it('typing exact visible email yields 1 card (repro from #96)', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Sincere@april.biz' } });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // only 1 card should remain
    const cards = document.querySelectorAll('.robo-card');
    expect(cards.length).toBe(1);
    expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument();
    expect(screen.queryByText('Clementine Bauch')).not.toBeInTheDocument();
  });

  it('email search is case-insensitive', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'sincere@april.biz' } });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.querySelectorAll('.robo-card').length).toBe(1);
  });

  it('partial email matches correctly', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'april.biz' } });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.querySelectorAll('.robo-card').length).toBe(1);
  });

  it('name search still works', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Leanne' } });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.querySelectorAll('.robo-card').length).toBe(1);
  });

  it('non-matching query shows empty state', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'nonexistent@xyz.invalid' } });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    expect(document.querySelectorAll('.robo-card').length).toBe(0);
  });

  it('source filters on email OR name case-insensitive', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
    // must consult email
    expect(src).toMatch(/robot\.email/);
    expect(src).toMatch(/lowerEmail/);
    // must still consult name and be case-insensitive via toLowerCase
    expect(src).toMatch(/lowerName/);
    expect(src).toMatch(/debouncedLower/);
  });
});
