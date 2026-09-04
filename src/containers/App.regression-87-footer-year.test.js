import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
import fs from 'fs';
import path from 'path';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

function mockFetchFailure() {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }));
}

function mockFetchPending() {
  global.fetch = jest.fn(() => new Promise(() => {}));
}

describe('regression #87 footer year is dynamic not hardcoded', () => {
  const currentYear = String(new Date().getFullYear());

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

  it('App.js uses dynamic year via getFullYear and not hardcoded year', () => {
    const src = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
    // Must use dynamic year
    expect(src).toMatch(/new Date\(\)\.getFullYear\(\)/);
    expect(src).toMatch(/currentYear/);
    // Must have footer with data-testid
    expect(src).toMatch(/data-testid="app-footer"/);
    expect(src).toMatch(/<footer/);
    // Should not contain hardcoded year like © 2023, © 2024, © 2025, © 2026 as literal
    expect(src).not.toMatch(/©\s*202\d/);
    expect(src).not.toMatch(/20(1\d|2\d)\s*RoboFriends/);
    // Ensure no literal year string hardcoded in footer context (e.g., "2023 RoboFriends")
    // We allow 202\d in comments or unrelated, but not as footer literal; simplest check: no "2023" etc near footer
    const footerLines = src.split('\n').filter(l => l.includes('app-footer') || l.includes('©'));
    footerLines.forEach(line => {
      expect(line).not.toMatch(/20\d{2}/);
    });
  });

  it('renders footer with current year on main success state (repro from #87)', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const footer = screen.getByTestId('app-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain(currentYear);
    expect(footer.textContent).toMatch(/RoboFriends/);
    // Should not be stale hardcoded year
    expect(footer.textContent).not.toContain('2023');
    if (currentYear !== '2024') expect(footer.textContent).not.toContain('2024');
    // Ensure footer contains ©
    expect(footer.textContent).toContain('©');
  });

  it('renders footer with current year while loading', async () => {
    mockFetchPending();
    render(<App />);
    // While loading, footer should still be present with dynamic year
    const footer = screen.getByTestId('app-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain(currentYear);
  });

  it('renders footer with current year on error state', async () => {
    mockFetchFailure();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    const footer = screen.getByTestId('app-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain(currentYear);
    expect(footer.textContent).toContain('©');
  });

  it('renders footer with current year in empty search and favorites empty states', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const footerMain = screen.getByTestId('app-footer');
    expect(footerMain.textContent).toContain(currentYear);

    // Trigger empty search state
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzzqqq-no-match-87' } });
    act(() => { jest.advanceTimersByTime(350); });
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    const footerEmpty = screen.getByTestId('app-footer');
    expect(footerEmpty).toBeInTheDocument();
    expect(footerEmpty.textContent).toContain(currentYear);

    // Clear search to return to main
    fireEvent.click(screen.getByTestId('clear-search-empty'));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.getByTestId('app-footer').textContent).toContain(currentYear);

    // Trigger favorites empty state
    const favFilterBtn = screen.getByText(/Show favorites/);
    fireEvent.click(favFilterBtn);
    await waitFor(() => expect(screen.getByText(/No favorites yet/)).toBeInTheDocument());
    const footerFavEmpty = screen.getByTestId('app-footer');
    expect(footerFavEmpty).toBeInTheDocument();
    expect(footerFavEmpty.textContent).toContain(currentYear);
    expect(footerFavEmpty.textContent).not.toMatch(/2023/);
  });

  it('footer year is truly dynamic - mocking Date changes footer (guards hardcoded)', async () => {
    const mockedYear = 2099;
    const OriginalDate = global.Date;
    // Mock Date to return mockedYear for getFullYear
    const MockDate = class extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super();
        } else {
          super(...args);
        }
      }
      getFullYear() {
        return mockedYear;
      }
      static now() {
        return new OriginalDate(`${mockedYear}-06-15T12:00:00Z`).getTime();
      }
    };
    // Ensure new Date().getFullYear() returns mocked year via prototype override simpler
    const originalGetFullYear = Date.prototype.getFullYear;
    Date.prototype.getFullYear = function() { return mockedYear; };

    mockFetchSuccess(mockRobots);
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const footer = screen.getByTestId('app-footer');
    expect(footer.textContent).toContain(String(mockedYear));
    expect(footer.textContent).not.toContain(currentYear === String(mockedYear) ? '1900' : currentYear);

    unmount();
    Date.prototype.getFullYear = originalGetFullYear;
    global.Date = OriginalDate;
  });
});
