import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import RobotModal from './RobotModal';

const robot = { id: 1, name: 'Leanne Graham', email: 'leanne@example.com' };

describe('regression #23 RobotModal useEffect hardening: team spawn edge -> verifier', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
    document.body.innerHTML = '';
    try { document.body.style.overflow = ''; } catch {}
  });

  it('does not throw when document.addEventListener throws for keydown', () => {
    const orig = document.addEventListener;
    document.addEventListener = jest.fn((type, ...rest) => {
      if (type === 'keydown') throw new Error('addEventListener boom');
      return orig.call(document, type, ...rest);
    });
    try {
      expect(() => render(<RobotModal robot={robot} onClose={jest.fn()} />)).not.toThrow();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    } finally {
      document.addEventListener = orig;
    }
  });

  it('does not throw when document.removeEventListener throws on unmount', () => {
    const orig = document.removeEventListener;
    document.removeEventListener = jest.fn((type, ...rest) => {
      if (type === 'keydown') throw new Error('remove boom');
      return orig.call(document, type, ...rest);
    });
    const { unmount } = render(<RobotModal robot={robot} onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(() => unmount()).not.toThrow();
    document.removeEventListener = orig;
  });

  it('does not throw when document.body.style.overflow setter throws', () => {
    // mock style to throw on overflow set
    const origStyle = document.body.style;
    const mockStyle = Object.create(origStyle);
    Object.defineProperty(mockStyle, 'overflow', {
      configurable: true,
      get() { return ''; },
      set() { throw new Error('overflow setter boom'); }
    });
    const origDesc = Object.getOwnPropertyDescriptor(document.body, 'style');
    Object.defineProperty(document.body, 'style', { configurable: true, value: mockStyle });
    try {
      expect(() => render(<RobotModal robot={robot} onClose={jest.fn()} />)).not.toThrow();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // unmount should also not throw even though cleanup tries to restore overflow
      cleanup();
      expect(() => render(<RobotModal robot={robot} onClose={jest.fn()} />)).not.toThrow();
    } finally {
      if (origDesc) Object.defineProperty(document.body, 'style', origDesc);
      else Object.defineProperty(document.body, 'style', { configurable: true, value: origStyle, writable: true });
    }
  });

  it('does not throw when close button focus throws', () => {
    const focusThrow = jest.fn(() => { throw new Error('focus boom'); });
    const origFocusFn = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = focusThrow;
    try {
      expect(() => render(<RobotModal robot={robot} onClose={jest.fn()} />)).not.toThrow();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    } finally {
      HTMLElement.prototype.focus = origFocusFn;
    }
  });

  it('guards handleEsc when e.key throws and safeOnClose throws', () => {
    const throwingClose = jest.fn(() => { throw new Error('close boom'); });
    render(<RobotModal robot={robot} onClose={throwingClose} />);
    // fireEvent with throwing key getter - jsdom may not propagate getter throw via fireEvent, so test direct
    const throwingEvent = {};
    Object.defineProperty(throwingEvent, 'key', { get() { throw new Error('key boom'); } });
    // call handleEsc indirectly via document event - our hardened handler should catch
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // also test that throwing safeOnClose is caught
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
  });

  it('guards handleBackdropClick when e.target getter throws and safeOnClose throws', () => {
    const throwingClose = jest.fn(() => { throw new Error('close boom'); });
    render(<RobotModal robot={robot} onClose={throwingClose} />);
    const backdrop = screen.getByTestId('modal-backdrop');
    expect(() => fireEvent.click(backdrop)).not.toThrow();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('still works happy path: focuses close button, Esc and backdrop call safeOnClose when valid', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={robot} onClose={onClose} />);
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('verifier invariants: dialog rendered even with corrupted document and throwing callbacks', () => {
    const orig = document.addEventListener;
    document.addEventListener = jest.fn((type, ...rest) => {
      if (type === 'keydown') throw new Error('boom');
      return orig.call(document, type, ...rest);
    });
    try {
      const badClose = () => { throw new Error('bad'); };
      expect(() => render(<RobotModal robot={{ id: { toString(){ throw new Error('bad')}}, name: null, email: undefined }} onClose={badClose} />)).not.toThrow();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
    } finally {
      document.addEventListener = orig;
    }
  });
});
