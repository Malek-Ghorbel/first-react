import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}
function mockFetchFailure(status = 500) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) }));
}

describe('verify end-to-end #23: API call -> team spawn -> edge cases -> verifier', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('happy path: API call succeeds, team spawn renders grid, verifier invariants hold', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // API call verifier
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // team spawn verifier
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(container.querySelector('.app-header')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBe(3);
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();

    // verifier final invariants - header, theme, search, pagination not broken
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('failure paths: API 500, missing fetch, sync throw and non-Error rejection all keep verifier alive', async () => {
    // 500 failure
    mockFetchFailure(500);
    const { unmount: u1 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load robots/)).toBeInTheDocument();
    u1();
    jest.restoreAllMocks();
    document.body.innerHTML = '';

    // missing fetch
    const origFetch = global.fetch;
    global.fetch = undefined;
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots/)).toBeInTheDocument();
    global.fetch = origFetch;
    jest.restoreAllMocks();
    document.body.innerHTML = '';

    // sync throw
    global.fetch = jest.fn(() => { throw new Error('sync boom'); });
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/sync boom|Failed to load robots/)).toBeInTheDocument();
    jest.restoreAllMocks();
    document.body.innerHTML = '';

    // non-Error rejection (string)
    global.fetch = jest.fn(() => Promise.reject('string error'));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    jest.restoreAllMocks();
    document.body.innerHTML = '';

    // non-thenable
    global.fetch = jest.fn(() => ({ then: null }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
  });

  it('edge cases: corrupt theme, bad sort, throwing getters and bad toString do not crash verifier', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // corrupt theme fallback via direct render
    const inst = new App();
    inst.state.theme = 'corrupt';
    inst.state.robots = mockRobots;
    inst.state.isLoading = false;
    expect(() => inst.render()).not.toThrow();
    const out = inst.render();
    expect(out.props['data-theme']).toMatch(/^(light|dark)$/);

    // bad sort injection via UI should be sanitized
    const select = screen.getByLabelText(/Sort by/i);
    fireEvent.change(select, { target: { value: 'inject:desc' } });
    expect(['name:asc', 'name:desc', 'email:asc', 'email:desc']).toContain(select.value);

    // throwing toString in onSortChange
    const bad = { toString: () => { throw new Error('bad toString'); } };
    const inst2 = new App();
    let captured = null;
    inst2.setState = (u) => { captured = typeof u === 'function' ? u(inst2.state) : u; };
    expect(() => inst2.onSortChange({ target: { value: bad } })).not.toThrow();
    expect(['name', 'email']).toContain(captured.sortBy);

    // throwing searchfield
    const badSearch = { target: { value: { toString: () => { throw new Error('bad'); } } } };
    const inst3 = new App();
    inst3.setState = (u) => { captured = typeof u === 'function' ? u(inst3.state) : u; };
    // hack to avoid debounce setState issue - replace debounced
    inst3.debouncedSetSearch = () => {};
    expect(() => inst3.onSearchChange(badSearch)).not.toThrow();

    // favorites toggle with throwing id getter should not crash
    const throwingRobot = {};
    Object.defineProperty(throwingRobot, 'id', { get() { throw new Error('id boom'); } });
    throwingRobot.name = 'Throw';
    throwingRobot.email = 'throw@test.com';
    const inst4 = new App();
    inst4.state.favorites = [1];
    inst4.state.robots = [throwingRobot, ...mockRobots];
    inst4.state.isLoading = false;
    expect(() => inst4.render()).not.toThrow();

    // verifier still intact after all edge cases
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
  });

  it('team spawn callbacks remain stable: add favorite, filter, pagination, modal open/close', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // favorite toggle
    const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(favBtn);
    // favorites button should still be present (state updated)
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove Leanne Graham from favorites/i })).toBeInTheDocument());

    // modal open/close
    const card = screen.getByLabelText('View details for Leanne Graham');
    fireEvent.click(card);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // pagination verifier
    expect(container.querySelector('.pagination')).toBeInTheDocument();
    expect(container.querySelector('.pagination-btn')).toBeInTheDocument();

    // search verifier
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Leanne' } });
    expect(input.value).toBe('Leanne');
  });
});
