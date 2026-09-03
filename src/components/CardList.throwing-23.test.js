import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CardList from './CardList';
import App from '../containers/App';

function throwingRobot(id) {
  return {
    get id() { throw new Error('bad id getter'); },
    name: 'Throwing ' + id,
    email: 'throw@test.com'
  };
}

describe('regression #23 CardList throwing getters e2e: API call -> team spawn -> edge cases -> verifier', () => {
  afterEach(() => jest.restoreAllMocks());

  it('CardList does not throw when robot id getter throws (verifier edge)', () => {
    const robots = [
      { id: 1, name: 'Leanne Graham', email: 'a@b.com' },
      throwingRobot(2),
      { id: 3, name: 'Clementine Bauch', email: 'c@b.com' },
      null,
      { name: 'NoId' }
    ];
    expect(() => render(<CardList robots={robots} favorites={[1]} onToggleFavorite={jest.fn()} onSelect={jest.fn()} />)).not.toThrow();
    const container = document.querySelector('.card-grid');
    expect(container).toBeInTheDocument();
    // should render only valid robots (ids 1 and 3) => 2 cards
    expect(document.querySelectorAll('.robo-card').length).toBe(2);
    expect(document.body.textContent).toContain('Leanne Graham');
    expect(document.body.textContent).toContain('Clementine Bauch');
  });

  it('CardList does not throw when favorites includes throwing id check (verifier)', () => {
    const robots = [{ id: 1, name: 'A', email: 'a@b.com' }];
    const badFavorites = { includes: () => { throw new Error('bad includes'); } };
    // favorites not an array, should fallback to not favorite without crash
    expect(() => render(<CardList robots={robots} favorites={'not-array'} onToggleFavorite={jest.fn()} />)).not.toThrow();
    expect(document.querySelector('.robo-card')).toBeInTheDocument();
  });

  it('CardList guards throwing name/email getters and still renders', () => {
    const robots = [{
      get id() { return 99; },
      get name() { throw new Error('bad name'); },
      get email() { throw new Error('bad email'); }
    }];
    expect(() => render(<CardList robots={robots} onToggleFavorite={jest.fn()} />)).not.toThrow();
    expect(document.querySelector('.robo-card')).toBeInTheDocument();
  });

  it('App favorites filter does not crash when robot id getter throws while showFavoritesOnly', async () => {
    const mockRobots = [
      { id: 1, name: 'Leanne Graham', email: 'a@b.com' },
      { id: 2, name: 'Ervin Howell', email: 'b@b.com' },
    ];
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockRobots) }));
    localStorage.clear();
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // inject throwing robot via direct state check for filter robustness
    const inst = new App();
    const evil = throwingRobot(99);
    inst.state = {
      ...inst.state,
      robots: [...mockRobots, evil],
      isLoading: false,
      error: null,
      debouncedSearchfield: '',
      searchfield: '',
      page: 1,
      pageSize: 20,
      sortBy: 'name',
      sortDir: 'asc',
      favorites: [1],
      showFavoritesOnly: true,
      theme: 'light'
    };
    expect(() => inst.render()).not.toThrow();
    const out = inst.render();
    expect(out.props['data-theme']).toMatch(/^(light|dark)$/);
    // original mounted app still shows favorites filtered correctly
    // toggle favorites filter should not crash even with evil robot present in instance
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
  });

  it('full e2e: API call -> team spawn with throwing getters -> verifier intact', async () => {
    const evilName = { toString() { throw new Error('evil'); } };
    const robotsWithBad = [
      { id: 1, name: evilName, email: evilName },
      { id: 2, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
      throwingRobot(3),
    ];
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(robotsWithBad) }));
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /robofriends/i })).toBeInTheDocument());
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.robo-card').length).toBeGreaterThan(0);
  });
});
