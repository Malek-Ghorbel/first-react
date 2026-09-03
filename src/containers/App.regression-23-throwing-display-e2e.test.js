import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import Card from '../components/Card';
import SearchBox from '../components/SearchBox';
import RobotModal from '../components/RobotModal';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function throwingValue() {
  return { toString() { throw new Error('bad toString'); }, valueOf() { throw new Error('bad valueOf'); } };
}

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #23 throwing display e2e: API call -> team spawn -> edge cases -> verifier', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('Card does not crash when id/name/email throw on String conversion (edge cases -> verifier)', () => {
    const bad = throwingValue();
    expect(() => render(<Card id={bad} name={bad} email={bad} />)).not.toThrow();
    // verifier: still renders card without crashing, aria-label gracefully falls back
    expect(document.querySelector('.robo-card')).toBeInTheDocument();
  });

  it('Card handles throwing name with favorite toggle still safe', () => {
    const bad = throwingValue();
    expect(() => render(<Card id={1} name={bad} email="a@b.com" isFavorite={false} onToggleFavorite={jest.fn()} onSelect={jest.fn()} />)).not.toThrow();
    expect(document.querySelector('.robo-card')).toBeInTheDocument();
  });

  it('SearchBox does not crash when value throws on String conversion (team spawn edge case)', () => {
    const bad = throwingValue();
    expect(() => render(<SearchBox value={bad} searchChange={jest.fn()} onClear={jest.fn()} />)).not.toThrow();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    // clear button should not appear with empty fallback
    expect(screen.queryByTestId('search-clear-btn')).not.toBeInTheDocument();
  });

  it('SearchBox handles throwing value with non-function callbacks safely', () => {
    const bad = throwingValue();
    expect(() => render(<SearchBox value={bad} searchChange="not-a-fn" onClear={null} />)).not.toThrow();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('RobotModal does not crash when robot fields throw on String conversion', () => {
    const bad = throwingValue();
    const robot = { id: bad, name: bad, email: bad };
    expect(() => render(<RobotModal robot={robot} onClose={jest.fn()} />)).not.toThrow();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('RobotModal handles null robot fields with throwing guard', () => {
    const bad = { toString() { throw new Error('evil'); } };
    expect(() => render(<RobotModal robot={{ id: bad, name: null, email: undefined }} onClose="not-fn" />)).not.toThrow();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('full e2e: API call -> team spawn -> throwing robot data does not crash verifier (happy path guard)', async () => {
    const evil = { toString() { throw new Error('evil'); } };
    const robotsWithBad = [
      { id: 1, name: evil, email: evil },
      { id: 2, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
      { id: 3, name: evil, email: 'safe@example.com' },
    ];
    mockFetchSuccess(robotsWithBad);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /robofriends/i })).toBeInTheDocument());
    // verifier invariants: header, theme, app-root still present despite throwing values
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // at least one safe robot should still render as card
    expect(container.querySelectorAll('.robo-card').length).toBeGreaterThan(0);
  });

  it('failure paths: API 500, missing fetch, non-thenable, sync throw preserve verifier header', async () => {
    const cases = [
      () => { global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })); },
      () => { global.fetch = undefined; },
      () => { global.fetch = jest.fn(() => ({ then: null })); },
      () => { global.fetch = jest.fn(() => { throw new Error('sync boom'); }); },
      () => { global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => { throw new Error('json throw'); } })); },
    ];
    for (const setup of cases) {
      localStorage.clear();
      setup();
      const { unmount } = render(<App />);
      await waitFor(() => expect(screen.getByText(/Error:/i)).toBeInTheDocument());
      expect(screen.getByRole('heading', { name: /robofriends/i })).toBeInTheDocument();
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
      unmount();
      jest.restoreAllMocks();
    }
  });

  it('happy path: API call spawns team and verifier sees grid + header + theme toggle', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 1, name: /robofriends/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
  });
});
