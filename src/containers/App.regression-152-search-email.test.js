import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #152 search matches name OR email case-insensitively', () => {
  beforeEach(() => { localStorage.clear(); jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); localStorage.clear(); });

  it('typing a robot email shows that robot (case-insensitive)', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'SINCERE@APRIL.BIZ' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(document.querySelectorAll('.robo-card').length).toBe(1);
    expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument();
  });

  it('source matches email OR name case-insensitively', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
    expect(src).toMatch(/robot\.email/);
    expect(src).toMatch(/lowerName\.includes\(debouncedLower\) \|\| lowerEmail\.includes\(debouncedLower\)/);
  });
});
