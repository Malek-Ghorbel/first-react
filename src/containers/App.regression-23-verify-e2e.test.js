import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
import Scroll from '../components/Scroll';
import ErrorBoundry from './ErrorBoundry';

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

describe('regression #23 verify e2e: API call -> team spawn -> edge cases -> verifier (Scroll/ErrorBoundary guards)', () => {
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

  it('Scroll does not throw when children getter throws (team spawn edge)', () => {
    const props = {};
    Object.defineProperty(props, 'children', { get() { throw new Error('children boom'); } });
    expect(() => render(<Scroll {...props} />)).not.toThrow();
    expect(document.querySelector('.modern-scroll')).toBeInTheDocument();
  });

  it('Scroll does not throw when props is null-ish and verifier still shows scroll container via App', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
    // direct render with undefined props should not throw
    expect(() => render(<Scroll />)).not.toThrow();
    expect(() => render(<Scroll>{null}</Scroll>)).not.toThrow();
  });

  it('ErrorBoundry does not throw when hasError getter throws or children getter throws', () => {
    // hasError throwing
    const eb1 = new ErrorBoundry({ children: <div>child</div> });
    Object.defineProperty(eb1.state, 'hasError', { get() { throw new Error('hasError boom'); }, configurable: true });
    expect(() => eb1.render()).not.toThrow();

    // children throwing
    const props = {};
    Object.defineProperty(props, 'children', { get() { throw new Error('children boom'); } });
    expect(() => render(<ErrorBoundry {...props} />)).not.toThrow();

    // normal case renders children
    const { container } = render(<ErrorBoundry><div data-testid="inner">ok</div></ErrorBoundry>);
    expect(screen.getByTestId('inner')).toBeInTheDocument();
    expect(container.querySelector('h2')).not.toBeInTheDocument();
  });

  it('ErrorBoundry shows fallback when hasError true and guards throwing state', () => {
    const eb = new ErrorBoundry({ children: <div>child</div> });
    eb.state = { hasError: true };
    const out = eb.render();
    expect(out.props.children).toMatch(/oops/);
  });

  it('full e2e happy path: API call -> team spawn (Scroll+ErrorBoundary+CardList) -> verifier', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // team spawn verifier
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBe(3);
    expect(container.querySelector('.pagination')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    // ErrorBoundary is present (does not show error)
    expect(screen.queryByText(/oops something went wrong/i)).not.toBeInTheDocument();
  });

  it('full e2e failure path: API 500 -> error -> Retry -> success -> verifier', async () => {
    mockFetchFailure(500);
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/Failed to load robots \(500\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    // retry succeeds
    mockFetchSuccess(mockRobots);
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => expect(screen.getByText(/loading \.\.\./i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.querySelector('.modern-scroll')).toBeInTheDocument();
    expect(document.querySelector('.card-grid')).toBeInTheDocument();
  });

  it('edge cases: search debounce, favorites, scroll preserved, error boundary not triggered', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // search debounce
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Clementine' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('Clementine Bauch')).toBeInTheDocument());
    expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // no results
    fireEvent.change(input, { target: { value: 'zzzzNotExist' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // favorites
    fireEvent.click(screen.getByRole('button', { name: /Add Leanne Graham to favorites/i }));
    expect(JSON.parse(localStorage.getItem('robofriends:favorites'))).toEqual([1]);
    expect(container.querySelector('.modern-scroll')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(screen.queryByText(/oops something went wrong/i)).not.toBeInTheDocument();

    // verifier final
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
