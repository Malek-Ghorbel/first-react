import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })
  );
}

function typeSearch(value) {
  const input = screen.getByRole('searchbox');
  fireEvent.change(input, { target: { value } });
  act(() => {
    jest.advanceTimersByTime(300);
  });
  return input;
}

describe('regression #155 empty state for non-matching search', () => {
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

  it('non-matching query renders a visible empty-state message containing the query text', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('zzz-no-such-robot');

    const message = await screen.findByTestId('empty-state');
    expect(message).toBeInTheDocument();
    expect(message).toBeVisible();
    expect(message.textContent).toMatch(/No robots found/);
    expect(message.textContent).toContain('zzz-no-such-robot');
    expect(message).toHaveAttribute('role', 'status');
    expect(message).toHaveAttribute('aria-live', 'polite');
    // no cards while there are no results (not a blank broken grid)
    expect(document.querySelectorAll('.robo-card').length).toBe(0);
    // message sits under the search box in DOM order
    const input = screen.getByRole('searchbox');
    expect(input.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('empty state is announced with the query text (accessible name contains the query)', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('zzz-no-such-robot');

    // The status region's accessible name must expose the query so AT users
    // hear what was searched, not just a generic message.
    const announced = await screen.findByRole('status', { name: /zzz-no-such-robot/ });
    expect(announced).toBeInTheDocument();
    expect(announced).toHaveTextContent(/No robots found/);
  });

  it('matching queries are unchanged (grid returns, empty state hides)', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    typeSearch('zzz-no-such-robot');
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());

    typeSearch('Leanne');
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('loading state is unchanged (no empty state while loading)', async () => {
    let resolveJson;
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) =>
          resolve({
            ok: true,
            status: 200,
            json: () => new Promise((res) => (resolveJson = res)),
          })
        )
    );
    render(<App />);
    // still loading: skeleton shows, empty state must not appear
    expect(await screen.findByText(/loading \.\.\./i)).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    act(() => {
      resolveJson(mockRobots);
    });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
  });
});
