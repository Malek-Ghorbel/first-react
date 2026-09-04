import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import fs from 'fs';
import path from 'path';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #85 button hover has visible feedback', () => {
  afterEach(() => jest.restoreAllMocks());

  it('app.css defines visible hover state for buttons (repro from #85)', () => {
    const css = fs.readFileSync(path.join(__dirname, 'app.css'), 'utf8');
    // At least one button-related hover must exist; we add modal-close and search-clear
    expect(css).toMatch(/\.modal-close:hover/);
    expect(css).toMatch(/\.search-clear:hover/);
    // Hover should provide visible feedback: background, filter, outline, border-color, box-shadow or transform
    const modalHoverBlock = css.match(/\.modal-close:hover\s*\{[^}]+\}/);
    expect(modalHoverBlock).toBeTruthy();
    if (modalHoverBlock) {
      const block = modalHoverBlock[0];
      const hasFeedback = /background|filter:\s*brightness|outline|border-color|box-shadow|transform/.test(block);
      expect(hasFeedback).toBe(true);
    }
    const clearHoverBlock = css.match(/\.search-clear:hover\s*\{[^}]+\}/);
    expect(clearHoverBlock).toBeTruthy();
    if (clearHoverBlock) {
      const block = clearHoverBlock[0];
      const hasFeedback = /background|filter|outline|border-color|box-shadow|transform/.test(block);
      expect(hasFeedback).toBe(true);
    }
    // Ensure generic button hover coverage not accidentally removed for existing buttons
    expect(css).toMatch(/\.toolbar-btn:hover/);
    expect(css).toMatch(/\.pagination-btn[^}]*:hover/);
  });

  it('renders modal-close and search-clear buttons with hover classes and they remain interactive', async () => {
    mockFetchSuccess(mockRobots);
    jest.useFakeTimers();
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // pagination buttons should have pagination-btn class (existing hover)
    expect(container.querySelector('.pagination-btn')).toBeInTheDocument();
    expect(container.querySelector('.toolbar-btn')).toBeInTheDocument();

    // open modal to get modal-close button
    const card = screen.getByLabelText('View details for Leanne Graham');
    fireEvent.click(card);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toHaveClass('modal-close');
    expect(() => fireEvent.click(closeBtn)).not.toThrow();

    // close modal
    fireEvent.click(closeBtn);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // search to trigger empty state modal-close hover target
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzzqqq-no-match' } });
    // App debounces 300ms
    jest.advanceTimersByTime(350);
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    const emptyClearBtn = screen.getByTestId('clear-search-empty');
    expect(emptyClearBtn).toHaveClass('modal-close');
    fireEvent.click(emptyClearBtn);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // search-clear button appears when typing
    fireEvent.change(input, { target: { value: 'Leanne' } });
    jest.advanceTimersByTime(350);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const clearBtn = screen.queryByTestId('search-clear-btn');
    // when searching for Leanne, input has value "Leanne" so clear button should appear
    // But note debounced value is not used for clear button visibility; it uses displayValue based on prop value (searchfield)
    // So after typing Leanne, clear should be visible
    expect(clearBtn).toBeInTheDocument();
    expect(clearBtn).toHaveClass('search-clear');
    expect(() => fireEvent.click(clearBtn)).not.toThrow();

    jest.useRealTimers();
  });

  it('hover styles are subtle and not breaking layout (transform/box-shadow)', () => {
    const css = fs.readFileSync(path.join(__dirname, 'app.css'), 'utf8');
    const modalHover = css.match(/\.modal-close:hover\s*\{([^}]+)\}/);
    expect(modalHover).toBeTruthy();
    const content = modalHover ? modalHover[1] : '';
    // should be subtle: translateY(-1px) or brightness < 1.2, not huge transforms
    expect(content).toMatch(/translateY\(/);
    // should not hide button
    expect(content).not.toMatch(/display:\s*none/);
    expect(content).not.toMatch(/visibility:\s*hidden/);
  });
});
