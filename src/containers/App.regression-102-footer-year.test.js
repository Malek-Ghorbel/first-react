import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import fs from 'fs';
import path from 'path';

describe('regression #102 footer year is dynamic', () => {
  it('App.js uses getFullYear and not hardcoded year (fixes #102)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
    expect(src).toMatch(/new Date\(\)\.getFullYear\(\)/);
    expect(src).toMatch(/currentYear/);
    expect(src).not.toMatch(/©\s*202\d/);
  });

  it('renders footer with current year (fixes #102)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' }]) }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const footer = screen.getByTestId('app-footer');
    const currentYear = String(new Date().getFullYear());
    expect(footer.textContent).toContain(currentYear);
    expect(footer.textContent).toContain('©');
  });
});
