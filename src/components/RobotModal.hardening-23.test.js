import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RobotModal from './RobotModal';

const robot = { id: 1, name: 'Leanne Graham', email: 'leanne@example.com' };

describe('regression #23 team spawn verifier: RobotModal safeOnClose', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not throw when onClose is undefined and Esc is pressed', () => {
    expect(() => {
      render(<RobotModal robot={robot} onClose={undefined} />);
      fireEvent.keyDown(document, { key: 'Escape' });
    }).not.toThrow();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not throw when onClose is null and backdrop clicked', () => {
    expect(() => {
      render(<RobotModal robot={robot} onClose={null} />);
      fireEvent.click(screen.getByTestId('modal-backdrop'));
    }).not.toThrow();
  });

  it('does not throw when onClose is string/number/object and Close button clicked', () => {
    const badCallbacks = ['string', 123, {}, [], 0, false];
    for (const bad of badCallbacks) {
      const { unmount } = render(<RobotModal robot={robot} onClose={bad} />);
      expect(() => fireEvent.click(screen.getByRole('button', { name: /close/i }))).not.toThrow();
      // dialog should still be there because safeOnClose is noop
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      unmount();
    }
  });

  it('still calls onClose when it is a valid function', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={robot} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('guards against corrupted robot prop without crashing (verifier edge)', () => {
    const cases = [null, undefined, {}, { id: null, name: null, email: null }, { id: 2, name: 12345, email: 67890 }];
    for (const r of cases) {
      const { unmount } = render(<RobotModal robot={r} onClose={jest.fn()} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      unmount();
    }
  });
});
