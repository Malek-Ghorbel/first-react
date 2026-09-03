import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './containers/App';
import fs from 'fs';
import path from 'path';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }));
}

describe('modern UI regression - improves fluid browsing experience', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('global CSS modern tokens', () => {
    it('index.css has modern fluid styling (scroll-behavior, CSS variables, gradients, backdrop)', () => {
      const css = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
      expect(css).toMatch(/scroll-behavior:\s*smooth/);
      expect(css).toMatch(/--bg-/);
      expect(css).toMatch(/--accent/);
      expect(css).toMatch(/radial-gradient/);
      expect(css).toMatch(/background-attachment:\s*fixed/);
      expect(css).toMatch(/:root/);
      expect(css).toMatch(/@keyframes\s+fadeIn/);
    });

    it('app.css has modern layout (grid, backdrop-filter, card styling, fluid animations)', () => {
      const css = fs.readFileSync(path.join(__dirname, 'containers', 'app.css'), 'utf8');
      expect(css).toMatch(/\.app-root/);
      expect(css).toMatch(/\.app-header/);
      expect(css).toMatch(/backdrop-filter:\s*blur/);
      expect(css).toMatch(/\.card-grid/);
      expect(css).toMatch(/grid-template-columns:\s*repeat/);
      expect(css).toMatch(/\.robo-card/);
      expect(css).toMatch(/transition:\s*transform/);
      expect(css).toMatch(/\.search-input-modern/);
      expect(css).toMatch(/\.modern-scroll/);
      expect(css).toMatch(/scroll-behavior:\s*smooth/);
      expect(css).toMatch(/@media/);
      expect(css).toMatch(/@keyframes\s+modalEnter/);
      expect(css).toMatch(/clamp\(/);
    });
  });

  describe('component modern interfaces', () => {
    it('renders modern app shell with header, grid and fluid pagination', async () => {
      mockFetchSuccess(mockRobots);
      const { container } = render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

      // App shell
      expect(container.querySelector('.app-root')).toBeInTheDocument();
      expect(container.querySelector('.app-header')).toBeInTheDocument();
      expect(container.querySelector('.app-main')).toBeInTheDocument();

      // Grid layout instead of legacy dib stack
      const grid = container.querySelector('.card-grid');
      expect(grid).toBeInTheDocument();
      // cards inside grid
      const cards = container.querySelectorAll('.robo-card');
      expect(cards.length).toBeGreaterThan(0);
      // Card has modern transition and lazy image
      const firstImg = container.querySelector('.robo-card img');
      expect(firstImg).toHaveAttribute('loading', 'lazy');

      // Search has modern pill input with icon
      const input = screen.getByRole('searchbox');
      expect(input).toHaveClass('search-input-modern');
      expect(container.querySelector('.search-icon')).toBeInTheDocument();
      expect(container.querySelector('.search-wrapper')).toBeInTheDocument();

      // Scroll has smooth modern container
      expect(container.querySelector('.modern-scroll')).toBeInTheDocument();

      // Pagination has modern pill buttons
      expect(container.querySelector('.pagination')).toBeInTheDocument();
      expect(container.querySelector('.pagination-btn')).toBeInTheDocument();
      expect(container.querySelector('.pagination-info')).toBeInTheDocument();

      // Toolbar buttons are modern pill style
      expect(container.querySelector('.toolbar')).toBeInTheDocument();
      expect(container.querySelector('.toolbar-btn')).toBeInTheDocument();
      expect(container.querySelector('.sort-select')).toBeInTheDocument();
    });

    it('loading state shows modern skeleton and branded title', async () => {
      // never resolving fetch keeps loading
      global.fetch = jest.fn(() => new Promise(() => {}));
      const { container } = render(<App />);
      expect(screen.getByText(/loading \.\.\./i)).toBeInTheDocument();
      expect(screen.getByText(/loading \.\.\./i)).toHaveClass('loading-title');
      expect(container.querySelector('.loading-container')).toBeInTheDocument();
      expect(container.querySelector('.skeleton-grid')).toBeInTheDocument();
      expect(container.querySelector('.app-header')).toBeInTheDocument();
    });

    it('card has fluid hover and favorite button with modern styling', async () => {
      mockFetchSuccess(mockRobots);
      const { container } = render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
      expect(favBtn).toHaveClass('favorite-btn');
      // card container still accessible as button for modal
      const card = screen.getByLabelText('View details for Leanne Graham');
      expect(card).toHaveClass('robo-card');
    });

    it('modal uses modern backdrop blur and animation classes when opened', async () => {
      mockFetchSuccess(mockRobots);
      const { container } = render(<App />);
      await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
      const card = screen.getByLabelText('View details for Leanne Graham');
      card.click();
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveClass('modal-dialog');
      expect(screen.getByRole('button', { name: /close/i })).toHaveClass('modal-close');
    });
  });
});
