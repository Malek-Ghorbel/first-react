import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
];

function mockFetchSuccess(data = mockRobots, status = 200) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) })
  );
}

describe('health', () => {
  afterEach(() => jest.restoreAllMocks());

  it('root route returns 200 and renders app title as h1', async () => {
    mockFetchSuccess(mockRobots, 200);
    render(<App />);

    // Title must be rendered as an <h1> (not a bare div)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument());

    const heading = screen.getByRole('heading', { level: 1, name: /robofriends/i });
    expect(heading.tagName).toBe('H1');

    // Root "route" (App) fetched successfully (simulated 200)
    expect(global.fetch).toHaveBeenCalled();
    // App did not render an error and shows content (h1 visible)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
