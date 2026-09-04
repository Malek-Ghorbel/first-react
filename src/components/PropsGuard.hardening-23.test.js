import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Card from './Card';
import CardList from './CardList';
import SearchBox from './SearchBox';
import RobotModal from './RobotModal';

describe('regression #23: props getter hardening - API call -> team spawn -> edge cases -> verifier', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  // Helper to create props object with enumerable throwing getter without triggering spread throw
  function propsWithThrowingGetter(key, errMsg = 'getter boom') {
    const p = {};
    Object.defineProperty(p, key, {
      get() { throw new Error(errMsg); },
      enumerable: true,
      configurable: true,
    });
    return p;
  }

  it('Card does not throw when props getters throw (team spawn edge)', () => {
    // Card props getter throwing - verifier should not crash
    const base = { id: 1, name: 'Leanne', email: 'a@a.com', isFavorite: false, onToggleFavorite: jest.fn(), onSelect: jest.fn() };
    // Inject throwing getter via Object.defineProperty on props object passed via createElement
    const throwingProps = { ...base };
    Object.defineProperty(throwingProps, 'name', { get() { throw new Error('name boom'); }, enumerable: true, configurable: true });
    expect(() => render(React.createElement(Card, throwingProps))).not.toThrow();
    cleanup();
    Object.defineProperty(throwingProps, 'name', { value: 'Leanne', writable: true, enumerable: true, configurable: true });
    Object.defineProperty(throwingProps, 'email', { get() { throw new Error('email boom'); }, enumerable: true, configurable: true });
    expect(() => render(React.createElement(Card, throwingProps))).not.toThrow();
    cleanup();
    // id getter throwing
    const idThrow = { ...base };
    Object.defineProperty(idThrow, 'id', { get() { throw new Error('id boom'); }, enumerable: true, configurable: true });
    expect(() => render(React.createElement(Card, idThrow))).not.toThrow();
    cleanup();
    // onSelect getter throwing
    const selectThrow = { ...base };
    Object.defineProperty(selectThrow, 'onSelect', { get() { throw new Error('select boom'); }, enumerable: true, configurable: true });
    expect(() => render(React.createElement(Card, selectThrow))).not.toThrow();
    cleanup();
    // null props should not throw
    expect(() => render(React.createElement(Card, null))).not.toThrow();
    cleanup();
    expect(() => render(React.createElement(Card, undefined))).not.toThrow();
    cleanup();
    // verifier: Card still renders something (at least no crash)
    const { container } = render(<Card id={1} name="Leanne" email="a@a.com" />);
    expect(container.querySelector('.robo-card')).toBeInTheDocument();
  });

  it('CardList does not throw when robots/favorites getters throw', () => {
    const robots = [{ id: 1, name: 'Leanne', email: 'a@a.com' }];
    // props with throwing robots getter via createElement (bypass spread)
    const props = {};
    Object.defineProperty(props, 'robots', { get() { throw new Error('robots boom'); }, enumerable: true, configurable: true });
    Object.defineProperty(props, 'favorites', { value: [], enumerable: true, configurable: true });
    expect(() => render(React.createElement(CardList, props))).not.toThrow();
    cleanup();
    const props2 = {};
    Object.defineProperty(props2, 'favorites', { get() { throw new Error('fav boom'); }, enumerable: true, configurable: true });
    props2.robots = robots;
    expect(() => render(React.createElement(CardList, props2))).not.toThrow();
    cleanup();
    const props3 = {};
    Object.defineProperty(props3, 'onToggleFavorite', { get() { throw new Error('toggle boom'); }, enumerable: true, configurable: true });
    props3.robots = robots;
    expect(() => render(React.createElement(CardList, props3))).not.toThrow();
    cleanup();
    // happy path still spawns
    const { container } = render(<CardList robots={robots} favorites={[]} onToggleFavorite={jest.fn()} onSelect={jest.fn()} />);
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    expect(container.querySelector('.robo-card')).toBeInTheDocument();
  });

  it('SearchBox does not throw when value/searchChange getters throw', () => {
    const props = {};
    Object.defineProperty(props, 'value', { get() { throw new Error('value boom'); }, enumerable: true, configurable: true });
    props.searchChange = jest.fn();
    props.onClear = jest.fn();
    expect(() => render(React.createElement(SearchBox, props))).not.toThrow();
    cleanup();
    const props2 = {};
    Object.defineProperty(props2, 'searchChange', { get() { throw new Error('searchChange boom'); }, enumerable: true, configurable: true });
    props2.value = 'test';
    expect(() => render(React.createElement(SearchBox, props2))).not.toThrow();
    cleanup();
    const props3 = {};
    Object.defineProperty(props3, 'onClear', { get() { throw new Error('onClear boom'); }, enumerable: true, configurable: true });
    props3.value = 'x';
    expect(() => render(React.createElement(SearchBox, props3))).not.toThrow();
    cleanup();
    // hideClear getter throwing
    const props4 = { value: 'x', searchChange: jest.fn(), onClear: jest.fn() };
    Object.defineProperty(props4, 'hideClear', { get() { throw new Error('hide boom'); }, enumerable: true, configurable: true });
    expect(() => render(React.createElement(SearchBox, props4))).not.toThrow();
    cleanup();
    // verifier: searchbox renders input even after throwing
    render(<SearchBox value="hello" searchChange={jest.fn()} onClear={jest.fn()} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('hello');
  });

  it('RobotModal does not throw when robot/onClose getters throw', () => {
    const props = {};
    Object.defineProperty(props, 'robot', { get() { throw new Error('robot boom'); }, enumerable: true, configurable: true });
    props.onClose = jest.fn();
    expect(() => render(React.createElement(RobotModal, props))).not.toThrow();
    cleanup();
    const props2 = {};
    Object.defineProperty(props2, 'onClose', { get() { throw new Error('onClose boom'); }, enumerable: true, configurable: true });
    props2.robot = { id: 1, name: 'Leanne', email: 'a@a.com' };
    expect(() => render(React.createElement(RobotModal, props2))).not.toThrow();
    cleanup();
    const props3 = {};
    Object.defineProperty(props3, 'robot', { get() { throw new Error('robot boom'); }, enumerable: true, configurable: true });
    Object.defineProperty(props3, 'onClose', { get() { throw new Error('close boom'); }, enumerable: true, configurable: true });
    expect(() => render(React.createElement(RobotModal, props3))).not.toThrow();
    cleanup();
    // null robot still renders modal wrapper (verifier checks backdrop/dialog)
    const { container } = render(<RobotModal robot={null} onClose={jest.fn()} />);
    expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
    expect(container.querySelector('[role="dialog"]')).toBeInTheDocument();
  });

  it('full verifier: API call -> team spawn with throwing props -> edge cases -> verifier invariants', async () => {
    // Simulate team spawn edge: CardList receives robots with mixed throwing getters (already handled in App fetch)
    // Here we test isolated verifier that even with throwing props, the app shell stays alive
    const throwingRobot = {};
    Object.defineProperty(throwingRobot, 'id', { get() { throw new Error('id boom'); }, enumerable: true, configurable: true });
    Object.defineProperty(throwingRobot, 'name', { get() { throw new Error('name boom'); }, enumerable: true, configurable: true });
    Object.defineProperty(throwingRobot, 'email', { get() { throw new Error('email boom'); }, enumerable: true, configurable: true });
    const goodRobot = { id: 2, name: 'Ervin Howell', email: 'b@c.com' };
    const { container } = render(<CardList robots={[throwingRobot, goodRobot]} favorites={[]} onToggleFavorite={jest.fn()} onSelect={jest.fn()} />);
    // should still render at least the good robot, and not crash
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
    // verifier: at least one card rendered (goodRobot)
    expect(container.querySelectorAll('.robo-card').length).toBeGreaterThanOrEqual(1);
    // SearchBox with throwing value should still render wrapper
    const { container: c2 } = render(<SearchBox value={throwingRobot} searchChange={jest.fn()} onClear={jest.fn()} />);
    expect(c2.querySelector('.search-wrapper')).toBeInTheDocument();
  });
});
