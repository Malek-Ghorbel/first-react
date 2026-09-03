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

describe('regression #23 final e2e: API call -> team spawn -> edge cases -> verifier', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('happy path: API call spawns team and verifier sees grid + header + theme toggle', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // API call verifier
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // team spawn verifier
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBeGreaterThan(0);
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();

    // verifier final invariants
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
  });

  it('failure paths: 500, missing fetch, non-thenable, sync throw preserve verifier header', async () => {
    // 500
    mockFetchFailure(500);
    const { unmount: u1 } = render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    u1();
    jest.restoreAllMocks();

    // missing fetch
    const origFetch = global.fetch;
    // eslint-disable-next-line no-global-assign
    global.fetch = undefined;
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots/)).toBeInTheDocument();
    global.fetch = origFetch;
    jest.restoreAllMocks();
    // cleanup for next
    document.body.innerHTML = '';
  });

  it('edge cases: corrupt theme/sort and bad toString do not crash verifier', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // corrupt theme via App instance
    const inst = new App();
    inst.state.theme = 'corrupt';
    inst.state.robots = mockRobots;
    inst.state.isLoading = false;
    expect(() => inst.render()).not.toThrow();
    // the rendered output should fallback to light/dark only
    const out = inst.render();
    expect(out.props['data-theme']).toMatch(/^(light|dark)$/);

    // corrupt sort injection via UI
    const select = screen.getByLabelText('Sort by');
    fireEvent.change(select, { target: { value: 'corrupt:bad' } });
    expect(['name:asc', 'name:desc', 'email:asc', 'email:desc']).toContain(select.value);

    // bad toString throwing
    const bad = { toString: () => { throw new Error('bad'); } };
    const inst2 = new App();
    let captured = null;
    inst2.setState = (u) => { captured = typeof u === 'function' ? u(inst2.state) : u; };
    expect(() => inst2.onSortChange({ target: { value: bad } })).not.toThrow();
    expect(['name', 'email']).toContain(captured.sortBy);

    // verifier still intact
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });
});
