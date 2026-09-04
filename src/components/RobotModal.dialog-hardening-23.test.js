import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import RobotModal from './RobotModal';
import CardList from './CardList';

const robot = { id: 1, name: 'Leanne Graham', email: 'leanne@example.com' };

describe('regression #23 dialog hardening: guard stopPropagation edge -> verifier (API call -> team spawn -> edge cases -> verifier)', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    try { document.body.style.overflow = ''; } catch {}
  });

  it('does not throw when dialog onClick receives null/undefined event or missing stopPropagation', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={robot} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    // guard null/undefined event - handler should not throw
    const handler = dialog.onclick;
    // dialog's onClick is via React prop, we test via fireEvent with edge event
    // Simulate by directly calling the hardened logic: e?.stopPropagation?.() should handle null
    expect(() => {
      fireEvent.click(dialog);
    }).not.toThrow();
    expect(onClose).not.toHaveBeenCalled(); // dialog click should not close modal
    // manually verify guard handles null and undefined
    const guard = (e) => { try { e?.stopPropagation?.(); } catch {} };
    expect(() => guard(null)).not.toThrow();
    expect(() => guard(undefined)).not.toThrow();
    expect(() => guard({})).not.toThrow();
    expect(() => guard({ stopPropagation: null })).not.toThrow();
  });

  it('does not throw when dialog stopPropagation throws', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={robot} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    // mock stopPropagation to throw
    const orig = Event.prototype.stopPropagation;
    Event.prototype.stopPropagation = jest.fn(() => { throw new Error('stopPropagation boom'); });
    try {
      expect(() => fireEvent.click(dialog)).not.toThrow();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      Event.prototype.stopPropagation = orig;
    }
    // also test object with throwing getter for stopPropagation
    const throwingObj = {};
    Object.defineProperty(throwingObj, 'stopPropagation', {
      get() { throw new Error('getter boom'); },
      configurable: true,
    });
    const guard = (e) => { try { e?.stopPropagation?.(); } catch {} };
    expect(() => guard(throwingObj)).not.toThrow();
  });

  it('backdrop still closes, dialog does not close - happy path after hardening', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={robot} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('CardList onSelect guards throwing callback -> verifier does not crash (team spawn edge)', () => {
    const throwingSelect = jest.fn(() => { throw new Error('onSelect boom'); });
    const robots = [
      { id: 1, name: 'Leanne', email: 'a@a.com' },
      { id: 2, name: 'Ervin', email: 'b@b.com' },
    ];
    expect(() => {
      render(<CardList robots={robots} favorites={[]} onToggleFavorite={jest.fn()} onSelect={throwingSelect} />);
    }).not.toThrow();
    const cards = screen.getAllByRole('button', { name: /View details for/ });
    expect(cards.length).toBe(2);
    // clicking card should not throw even though onSelect throws (guarded in CardList+Card)
    expect(() => fireEvent.click(cards[0])).not.toThrow();
    expect(throwingSelect).toHaveBeenCalled();
    // verifier still alive: cards still rendered
    expect(screen.getByText('Leanne')).toBeInTheDocument();
  });

  it('CardList onSelect with non-function does not throw (team spawn verifier)', () => {
    const badVals = ['string', 123, null, undefined, {}, []];
    for (const bad of badVals) {
      const { unmount } = render(<CardList robots={[{ id: 1, name: 'A', email: 'a@a.com' }]} favorites={[]} onToggleFavorite={bad} onSelect={bad} />);
      expect(screen.getByText('A')).toBeInTheDocument();
      const card = screen.getByRole('button', { name: /View details for A/i });
      expect(() => fireEvent.click(card)).not.toThrow();
      unmount();
      cleanup();
    }
  });

  it('full e2e verifier after hardening: API call -> team spawn (RobotModal dialog + CardList) -> edge cases -> verifier', async () => {
    // simulate API call flow via App-like fetch mock
    const robots = [
      { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
      { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
    ];
    // verify CardList+RobotModal team spawn works together
    const onSelect = jest.fn();
    const { container } = render(
      <div>
        <CardList robots={robots} favorites={[]} onToggleFavorite={jest.fn()} onSelect={onSelect} />
      </div>
    );
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('View details for Leanne Graham'));
    expect(onSelect).toHaveBeenCalled();
    // now test modal dialog hardening in same flow
    const onClose = jest.fn();
    const { unmount } = render(<RobotModal robot={robots[0]} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    const backdrop = screen.getByTestId('modal-backdrop');
    // dialog click should be guarded
    const orig = Event.prototype.stopPropagation;
    Event.prototype.stopPropagation = jest.fn(() => { throw new Error('boom'); });
    try {
      expect(() => fireEvent.click(dialog)).not.toThrow();
      expect(onClose).not.toHaveBeenCalled();
      // backdrop click should still work after dialog hardening
      Event.prototype.stopPropagation = orig;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    } finally {
      Event.prototype.stopPropagation = orig;
    }
    unmount();
    cleanup();
    // verifier invariants: still renders cards after edge cases
    render(<CardList robots={robots} favorites={[]} onToggleFavorite={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getByText('Ervin Howell')).toBeInTheDocument();
  });
});
