import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import App from './App';
import Card from '../components/Card';
import CardList from '../components/CardList';

const robots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
];

const mockSuccess = (data = robots) => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
};

describe('regression #23: API call -> team spawn -> edge cases -> verifier full plus (fixes #23)', () => {
  let origFetchDesc;
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    cleanup();
    document.body.innerHTML = '';
    origFetchDesc = Object.getOwnPropertyDescriptor(global, 'fetch');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    cleanup();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    try {
      if (origFetchDesc) Object.defineProperty(global, 'fetch', origFetchDesc);
      else delete global.fetch;
    } catch {}
  });

  it('happy path: API call -> team spawn -> verifier', async () => {
    mockSuccess();
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(container.querySelector('.app-root')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
    // team spawn: favorites + theme
    const { fireEvent } = require('@testing-library/react');
    const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(favBtn);
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove Leanne Graham/i })).toBeInTheDocument());
  });

  it('failure: throwing fetch getter does not crash verifier', async () => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      get() { throw new Error('getter boom'); },
    });
    let crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('failure: fetch returns non-thenable does not crash verifier', async () => {
    global.fetch = jest.fn(() => ({ then: null }));
    let crashed = false;
    try { render(<App />); } catch { crashed = true; }
    expect(crashed).toBe(false);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('edge: React.createElement with throwing getter does not throw', () => {
    const throwingProps = {};
    Object.defineProperty(throwingProps, 'id', { get() { throw new Error('bomb'); }, enumerable: true, configurable: true });
    throwingProps.name = 'X';
    throwingProps.email = 'x@x.com';
    let el;
    expect(() => { el = React.createElement(Card, throwingProps); }).not.toThrow();
    expect(() => render(el)).not.toThrow();
  });

  it('edge: React.createElement with prototype throwing getter via proxy does not throw', () => {
    const proto = {};
    Object.defineProperty(proto, 'evil', { get() { throw new Error('proto bomb'); }, enumerable: true, configurable: true });
    const target = { id: 1, name: 'A', email: 'a@a.com' };
    Object.setPrototypeOf(target, proto);
    const proxy = new Proxy(target, {
      ownKeys(t) {
        return Reflect.ownKeys(t).concat(['evil']);
      },
      getOwnPropertyDescriptor(t, p) {
        if (p === 'evil') return null;
        return Reflect.getOwnPropertyDescriptor(t, p);
      },
    });
    let el;
    expect(() => { el = React.createElement(Card, proxy); }).not.toThrow();
    expect(el).toBeDefined();
  });

  it('edge: React.createElement with Reflect.ownKeys throwing falls back', () => {
    const origOwnKeys = Reflect.ownKeys;
    Reflect.ownKeys = () => { throw new Error('reflect boom'); };
    try {
      const props = { id: 2, name: 'B', email: 'b@b.com' };
      let el;
      expect(() => { el = React.createElement(Card, props); }).not.toThrow();
      expect(el).toBeDefined();
    } finally {
      Reflect.ownKeys = origOwnKeys;
    }
  });

  it('edge: React.cloneElement with throwing getter does not throw', () => {
    const base = React.createElement(Card, { id: 99, name: 'Base', email: 'base@test.com' });
    const cloneProps = {};
    Object.defineProperty(cloneProps, 'name', { get() { throw new Error('clone bomb'); }, enumerable: true, configurable: true });
    cloneProps.email = 'cloned@test.com';
    let cloned;
    expect(() => { cloned = React.cloneElement(base, cloneProps); }).not.toThrow();
    expect(() => render(cloned)).not.toThrow();
  });

  it('edge: React.cloneElement with null element does not crash verifier', () => {
    let result;
    expect(() => { result = React.cloneElement(null, { foo: 'bar' }); }).not.toThrow();
    expect(result).toBeNull();
  });

  it('edge: React.cloneElement with prototype getter via proxy does not throw', () => {
    const base = React.createElement(Card, { id: 1, name: 'Base', email: 'base@test.com' });
    const proto = {};
    Object.defineProperty(proto, 'evil', { get() { throw new Error('proto clone bomb'); }, enumerable: true, configurable: true });
    const target = { email: 'cloned@test.com' };
    Object.setPrototypeOf(target, proto);
    const proxy = new Proxy(target, {
      ownKeys(t) { return Reflect.ownKeys(t).concat(['evil']); },
      getOwnPropertyDescriptor(t, p) {
        if (p === 'evil') return null;
        return Reflect.getOwnPropertyDescriptor(t, p);
      },
    });
    let cloned;
    expect(() => { cloned = React.cloneElement(base, proxy); }).not.toThrow();
    expect(cloned).toBeDefined();
  });

  it('team spawn: CardList cloneElement remains functional after hardening', async () => {
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const listEl = React.createElement(CardList, { robots: [{ id: 100, name: 'Cloned Robot', email: 'c@c.com' }], favorites: [], onToggleFavorite: () => {}, onSelect: () => {} });
    const clonedList = React.cloneElement(listEl, { robots: [{ id: 101, name: 'Cloned2', email: 'c2@c.com' }] });
    expect(() => render(clonedList)).not.toThrow();
  });
});
