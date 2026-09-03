import React from 'react';
import App from './App';
import CardList from '../components/CardList';
import SearchBox from '../components/SearchBox';
import RobotModal from '../components/RobotModal';
import { render } from '@testing-library/react';

describe('throwing getters', () => {
  it('App render with throwing state getters should not throw', () => {
    const app = new App();
    // override state with throwing getters
    Object.defineProperty(app.state, 'theme', { get() { throw new Error('theme boom'); }, configurable: true });
    Object.defineProperty(app.state, 'robots', { get() { throw new Error('robots boom'); }, configurable: true });
    Object.defineProperty(app.state, 'sortBy', { get() { throw new Error('sort boom'); }, configurable: true });
    expect(() => app.render()).not.toThrow();
  });
  it('CardList with throwing props getter should not throw', () => {
    const props = {};
    Object.defineProperty(props, 'robots', { get() { throw new Error('robots boom'); } });
    Object.defineProperty(props, 'favorites', { get() { throw new Error('fav boom'); } });
    expect(() => render(<CardList {...props} />)).not.toThrow();
  });
  it('SearchBox with throwing value getter', () => {
    const props = {};
    Object.defineProperty(props, 'value', { get() { throw new Error('value boom'); } });
    expect(() => render(<SearchBox {...props} />)).not.toThrow();
  });
  it('RobotModal with throwing robot getter', () => {
    const props = {};
    Object.defineProperty(props, 'robot', { get() { throw new Error('robot boom'); } });
    expect(() => render(<RobotModal {...props} />)).not.toThrow();
  });
  it('App toggleTheme with throwing prev theme', () => {
    const app = new App();
    const prev = {};
    Object.defineProperty(prev, 'theme', { get() { throw new Error('theme boom'); } });
    expect(() => app.toggleTheme.call({ setState: (fn) => { const res = fn(prev); console.log('res', res); } })).not.toThrow();
  });
});
