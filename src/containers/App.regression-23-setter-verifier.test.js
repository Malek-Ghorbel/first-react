import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #23: setter verifier guards (API call -> team spawn -> edge cases -> verifier)', () => {
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

  it('API call guard: response without json throws Invalid data format not crash', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Invalid data format/)).toBeInTheDocument());
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
  });

  it('API call guard: response with json not a function throws Invalid data format', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: 'not-a-function' }));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Invalid data format/)).toBeInTheDocument());
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('toggleTheme guard: corrupt theme in state still toggles correctly to verifier', async () => {
    mockFetchSuccess([{ id: 1, name: 'A', email: 'a@b.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    const app = new App();
    // corrupt theme values: string corrupt, object, number, null, undefined, array
    const corruptValues = ['corrupt-theme-value', null, undefined, 123, {}, [], 'LIGHT', 'dark\0'];
    corruptValues.forEach((val) => {
      const instance = new App();
      instance.setState = (updater) => {
        const prev = { theme: val };
        const result = typeof updater === 'function' ? updater(prev) : updater;
        // should toggle to opposite of safePrev
        const safePrev = val === 'dark' ? 'dark' : 'light';
        const expected = safePrev === 'dark' ? 'light' : 'dark';
        expect(result.theme).toBe(expected);
      };
      instance.toggleTheme();
    });
    // also verify real toggle still works after mount
    const toggle = screen.getByTestId('theme-toggle');
    const before = document.documentElement.getAttribute('data-theme');
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).not.toBe(before);
    expect(['light', 'dark']).toContain(document.documentElement.getAttribute('data-theme'));
  });

  it('onSortChange guard: non-allowlisted injected values fallback to allowlisted', async () => {
    mockFetchSuccess([
      { id: 1, name: 'Zebra', email: 'z@b.com' },
      { id: 2, name: 'Apple', email: 'a@b.com' },
    ]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Apple')).toBeInTheDocument());
    const app = new App();
    const cases = [
      { input: 'foo:bar', expectedBy: 'name', expectedDir: 'asc' },
      { input: 'email:desc', expectedBy: 'email', expectedDir: 'desc' },
      { input: 'name:desc', expectedBy: 'name', expectedDir: 'desc' },
      { input: 'email:asc', expectedBy: 'email', expectedDir: 'asc' },
      { input: '__proto__:desc', expectedBy: 'name', expectedDir: 'desc' },
      { input: 'constructor:desc', expectedBy: 'name', expectedDir: 'desc' },
      { input: 'name:invalid', expectedBy: 'name', expectedDir: 'asc' },
      { input: 'email:invalid', expectedBy: 'email', expectedDir: 'asc' },
      { input: null, expectedBy: 'name', expectedDir: 'asc' },
      { input: undefined, expectedBy: 'name', expectedDir: 'asc' },
      { input: 123, expectedBy: 'name', expectedDir: 'asc' },
      { input: {}, expectedBy: 'name', expectedDir: 'asc' },
    ];
    cases.forEach(({ input, expectedBy, expectedDir }) => {
      const inst = new App();
      inst.setState = jest.fn();
      const e = { target: { value: input } };
      expect(() => inst.onSortChange(e)).not.toThrow();
      expect(inst.setState).toHaveBeenCalledWith({ sortBy: expectedBy, sortDir: expectedDir, page: 1 });
    });
  });

  it('onSortChange guard: bad toString throwing falls back to name:asc', async () => {
    const app = new App();
    app.setState = jest.fn();
    const bad = {
      toString() { throw new Error('toString boom'); }
    };
    const e = { target: { value: bad } };
    expect(() => app.onSortChange(e)).not.toThrow();
    expect(app.setState).toHaveBeenCalledWith({ sortBy: 'name', sortDir: 'asc', page: 1 });
  });

  it('full e2e with guards: API call -> team spawn -> edge cases -> verifier still passes', async () => {
    const robots = [
      { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
      { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
    ];
    mockFetchSuccess(robots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // verifier: root route 200
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // team spawn
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBe(2);
    // edge: corrupt sort injection should not leak to verifier (select value safe)
    const select = screen.getByLabelText('Sort by');
    fireEvent.change(select, { target: { value: 'corrupt:value' } });
    await waitFor(() => expect(select.value).toBe('name:asc'));
    expect(['name:asc', 'name:desc', 'email:asc', 'email:desc']).toContain(select.value);
    // edge: toggle theme with corrupt handling
    const toggle = screen.getByTestId('theme-toggle');
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    // verifier final
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
    expect(container.querySelector('.pagination')).toBeInTheDocument();
  });
});
