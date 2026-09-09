import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import fs from 'fs';
import path from 'path';

describe('regression #101 footer shows last year - must be dynamic', () => {
  const currentYear = String(new Date().getFullYear());
  const lastYear = String(new Date().getFullYear() - 1);

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('App.js uses dynamic year via getFullYear and not hardcoded last year (fixes #101)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
    expect(src).toMatch(/new Date\(\)\.getFullYear\(\)/);
    expect(src).toMatch(/currentYear/);
    expect(src).toMatch(/data-testid="app-footer"/);
    expect(src).toMatch(/<footer/);
    // Should not contain hardcoded year like © 2024 etc as literal in footer lines
    expect(src).not.toMatch(/©\s*202\d/);
    const footerLines = src.split('\n').filter(l => l.includes('app-footer') || l.includes('©'));
    footerLines.forEach(line => {
      expect(line).not.toMatch(/20\d{2}/);
    });
  });

  it('renders footer with current year and not last year (fixes #101)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' }]) }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const footer = screen.getByTestId('app-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain(currentYear);
    expect(footer.textContent).toContain('©');
    // Must not show last year (stale)
    if (currentYear !== lastYear) {
      expect(footer.textContent).not.toContain(lastYear);
    }
  });

  it('footer year is truly dynamic - mocking Date changes footer (guards hardcoded last year) (fixes #101)', async () => {
    const mockedYear = 2099;
    const originalGetFullYear = Date.prototype.getFullYear;
    Date.prototype.getFullYear = function () { return mockedYear; };

    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' }]) }));
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const footer = screen.getByTestId('app-footer');
    expect(footer.textContent).toContain(String(mockedYear));
    expect(footer.textContent).not.toContain(currentYear === String(mockedYear) ? '1900' : currentYear);

    unmount();
    Date.prototype.getFullYear = originalGetFullYear;
  });

  it('renders footer with current year while loading (fixes #101)', async () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<App />);
    const footer = screen.getByTestId('app-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain(currentYear);
    expect(footer.textContent).not.toContain(lastYear === currentYear ? '1900' : lastYear);
  });

  it('renders footer with current year on error state (fixes #101)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    const footer = screen.getByTestId('app-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain(currentYear);
  });
});
