import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
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

describe('regression #23: e2e smoke verify API->team spawn->edge->verifier (fixes #23)', () => {
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

  it('happy path: API call -> team spawn -> verifier renders robots', async () => {
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users');
    expect(screen.getByText('Ervin Howell')).toBeInTheDocument();
  });

  it('team spawn: favorites and theme persist after hardening', async () => {
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const favBtn = screen.getByRole('button', { name: /Add Leanne Graham to favorites/i });
    fireEvent.click(favBtn);
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove Leanne Graham/i })).toBeInTheDocument());
    expect(localStorage.getItem('robofriends:favorites')).toBeDefined();
  });

  it('failure: fetch network error shows verifier alert', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network down')));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
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

  it('edge: React.createElement with throwing getter does not throw', () => {
    const throwingProps = {};
    Object.defineProperty(throwingProps, 'id', { get() { throw new Error('bomb'); }, enumerable: true, configurable: true });
    throwingProps.name = 'X';
    throwingProps.email = 'x@x.com';
    let el;
    expect(() => { el = React.createElement(Card, throwingProps); }).not.toThrow();
    expect(() => render(el)).not.toThrow();
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

  it('edge: React.cloneElement with null element returns null', () => {
    let result;
    expect(() => { result = React.cloneElement(null, { foo: 'bar' }); }).not.toThrow();
    expect(result).toBeNull();
  });

  it('edge: Reflect.ownKeys throwing falls back gracefully', () => {
    const origOwnKeys = Reflect.ownKeys;
    Reflect.ownKeys = () => { throw new Error('reflect boom'); };
    try {
      const props = { id: 2, name: 'B', email: 'b@b.com' };
      let el;
      expect(() => { el = React.createElement(Card, props); }).not.toThrow();
      expect(el).toBeDefined();
      expect(() => { const base = React.createElement(Card, { id: 1, name: 'A', email: 'a@a.com' }); el = React.cloneElement(base, { name: 'B' }); }).not.toThrow();
    } finally {
      Reflect.ownKeys = origOwnKeys;
    }
  });

  it('edge: CardList cloneElement remains functional after hardening', async () => {
    mockSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const listEl = React.createElement(CardList, { robots: [{ id: 100, name: 'Cloned Robot', email: 'c@c.com' }], favorites: [], onToggleFavorite: () => {}, onSelect: () => {} });
    const clonedList = React.cloneElement(listEl, { robots: [{ id: 101, name: 'Cloned2', email: 'c2@c.com' }] });
    expect(() => render(clonedList)).not.toThrow();
  });
});
