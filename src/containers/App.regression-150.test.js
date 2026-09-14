import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

// Full robot list is visible again (names of every mocked robot are on screen).
function expectFullListVisible() {
  mockRobots.forEach(robot => {
    expect(screen.getByText(robot.name)).toBeInTheDocument();
  });
  expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
}

describe('regression #150 clearing the search box resets the query and the results', () => {
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

  it('restores the full list and resets the input as soon as the query is cleared', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'leanne' } });
    act(() => { jest.advanceTimersByTime(300); });
    expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument();

    // user clears the field (select all + delete / native search clear)
    fireEvent.change(input, { target: { value: '' } });

    // no further keystroke required: the box is empty and the full list is back right away
    expect(input).toHaveValue('');
    expectFullListVisible();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('clears through the × button even while a debounced keystroke is still pending', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    // type and clear before the 300ms debounce of the last keystroke has fired
    fireEvent.change(input, { target: { value: 'leanne' } });
    fireEvent.click(screen.getByTestId('search-clear-btn'));

    expect(input).toHaveValue('');
    expectFullListVisible();

    // the pending debounced keystroke must not re-apply the cleared query
    act(() => { jest.advanceTimersByTime(1000); });
    expect(input).toHaveValue('');
    expectFullListVisible();
  });

  it('clearing the box also clears the result count and the empty-state query text', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzzzNoMatch' } });
    act(() => { jest.advanceTimersByTime(300); });
    expect(screen.getByTestId('empty-state')).toHaveTextContent('zzzzNoMatch');

    fireEvent.change(input, { target: { value: '' } });
    act(() => { jest.advanceTimersByTime(300); });

    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    expectFullListVisible();
    expect(screen.getByTestId('result-count')).toHaveTextContent('3 robots found');
  });

  it('Escape clears the search box and brings the results back', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'leanne' } });
    act(() => { jest.advanceTimersByTime(300); });
    expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(input).toHaveValue('');
    expectFullListVisible();
  });

  it('typing a new query after clearing still filters (no state is left stale)', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'leanne' } });
    act(() => { jest.advanceTimersByTime(300); });

    fireEvent.click(screen.getByTestId('search-clear-btn'));
    expectFullListVisible();

    fireEvent.change(input, { target: { value: 'ervin' } });
    act(() => { jest.advanceTimersByTime(300); });

    expect(screen.getByText('Ervin Howell')).toBeInTheDocument();
    expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument();
    expect(screen.getByTestId('result-count')).toHaveTextContent('1 robot found');
  });

  it('keeps the clear affordance in sync: hidden when empty, shown when text is typed again', async () => {
    mockFetchSuccess();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    const input = screen.getByRole('searchbox');
    expect(screen.queryByTestId('search-clear-btn')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'leanne' } });
    expect(screen.getByTestId('search-clear-btn')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByTestId('search-clear-btn')).not.toBeInTheDocument();
    expectFullListVisible();
  });
});
