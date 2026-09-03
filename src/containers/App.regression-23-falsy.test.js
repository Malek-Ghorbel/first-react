import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
import Card from '../components/Card';

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('regression #23 falsy: 0, null and empty id guards', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('Card renders id=0 correctly and id=null does not leak "null" or "undefined"', () => {
    const { container: c0 } = render(<Card id={0} name="Zero" email="zero@test.com" isFavorite={false} onToggleFavorite={() => {}} onSelect={() => {}} />);
    const img0 = c0.querySelector('img');
    expect(img0.getAttribute('src')).toBe('https://robohash.org/0?size=200x200');
    expect(img0.getAttribute('alt')).toBe('Robot avatar for Zero');

    const { container: cNull } = render(<Card id={null} name="NoId" email="a@b.com" isFavorite={false} onToggleFavorite={() => {}} />);
    const imgNull = cNull.querySelector('img');
    // String(null ?? '') => "" => robohash.org/?size
    expect(imgNull.getAttribute('src')).toBe('https://robohash.org/?size=200x200');
    expect(imgNull.getAttribute('src')).not.toContain('null');
    expect(imgNull.getAttribute('src')).not.toContain('undefined');

    const { container: cUndef } = render(<Card id={undefined} name="Undef" email="b@b.com" />);
    const imgUndef = cUndef.querySelector('img');
    expect(imgUndef.getAttribute('src')).toBe('https://robohash.org/?size=200x200');
    expect(imgUndef.getAttribute('src')).not.toContain('undefined');
  });

  it('App handles robot with name=0 and searches for "0" correctly (?? vs ||)', async () => {
    mockFetchSuccess([
      { id: 1, name: 0, email: 'zero@test.com' },
      { id: 2, name: 'Leanne Graham', email: 'Sincere@april.biz' },
    ]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    // Initially search empty should show both rendered? Check that "0" card exists
    expect(screen.getByText('0')).toBeInTheDocument();

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: '0' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());
    expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // clear search should recover both
    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('App sorting handles numeric 0 values without treating as empty string', async () => {
    mockFetchSuccess([
      { id: 1, name: 0, email: 'b@test.com' },
      { id: 2, name: 'A', email: 'a@test.com' },
      { id: 3, name: 'Zebra', email: 'z@test.com' },
    ]);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());
    // default sort name:asc should order "0" < "A" < "Zebra" because "0".charCode < "a"
    let names = [...container.querySelectorAll('h2')].map((n) => n.textContent.trim());
    expect(names[0]).toBe('0');
    expect(names[1]).toBe('A');

    // sort desc should reverse
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name:desc' } });
    await waitFor(() => expect(screen.getByText('Zebra')).toBeInTheDocument());
    names = [...container.querySelectorAll('h2')].map((n) => n.textContent.trim());
    expect(names[0]).toBe('Zebra');
    expect(names[names.length - 1]).toBe('0');
  });

  it('App search with debouncedSearchfield numeric edge does not crash', async () => {
    mockFetchSuccess([{ id: 1, name: 'Leanne Graham', email: 'a@b.com' }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const input = screen.getByRole('searchbox');
    // simulate numeric value (falsy 0) via direct event
    fireEvent.change(input, { target: { value: 0 } });
    act(() => { jest.advanceTimersByTime(300); });
    // "0" should filter no match -> empty state with 0 in message
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    expect(screen.getByText(/No robots found for/).textContent).toContain('0');
    // clear recovers
    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
  });
});
