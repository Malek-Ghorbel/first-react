import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
];

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }));
}

describe('dark mode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    delete window.matchMedia;
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('renders toggle button to switch themes', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const toggle = screen.getByTestId('theme-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-label', expect.stringMatching(/Switch to (light|dark) mode/));
  });

  it('toggles between light and dark and persists to localStorage', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const toggle = screen.getByTestId('theme-toggle');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(toggle).toHaveTextContent(/Dark/);

    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('robofriends:theme')).toBe('dark');
    expect(toggle).toHaveTextContent(/Light/);
    expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode');

    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('robofriends:theme')).toBe('light');
    expect(toggle).toHaveTextContent(/Dark/);
  });

  it('loads theme from localStorage on mount', async () => {
    localStorage.setItem('robofriends:theme', 'dark');
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    const toggle = screen.getByTestId('theme-toggle');
    expect(toggle).toHaveTextContent(/Light/);
  });

  it('respects prefers-color-scheme when no stored theme', async () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggle is visible in loading and error states', async () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    const { unmount } = render(<App />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    unmount();

    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Error:/)).toBeInTheDocument());
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });
});
