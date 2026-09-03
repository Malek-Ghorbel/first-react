import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
];

function mockFetchSuccess(data = mockRobots) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }));
}

describe('hardening #23b: search/sort handlers guard non-string and null events', () => {
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

  it('onSearchChange handles numeric and null values without crash', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const input = screen.getByRole('searchbox');

    // numeric value via custom event
    fireEvent.change(input, { target: { value: 12345 } });
    act(() => { jest.advanceTimersByTime(300); });
    // App should not crash, and debouncedSearchfield should be stringified "12345"
    await waitFor(() => expect(screen.getByText(/No robots found for/)).toBeInTheDocument());
    // clear search should recover
    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // null target value -> should become empty string and not crash
    fireEvent.change(input, { target: { value: null } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // undefined value
    fireEvent.change(input, { target: { value: undefined } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
  });

  it('onSearchChange handles missing event target gracefully', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const input = screen.getByRole('searchbox');
    // fireEvent with target:null throws in testing-library before reaching component,
    // so we verify the guard directly via the component instance and also via a safe fireEvent
    const instance = new App();
    instance.setState = () => {};
    instance.debouncedSetSearch = () => {};
    expect(() => instance.onSearchChange(null)).not.toThrow();
    expect(() => instance.onSearchChange({})).not.toThrow();
    expect(() => instance.onSearchChange({ target: null })).not.toThrow();
    expect(() => instance.onSearchChange({ target: {} })).not.toThrow();
    expect(() => instance.onSearchChange({ target: { value: null } })).not.toThrow();
    // also verify UI still works with a valid empty change
    fireEvent.change(input, { target: { value: '' } });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(container.querySelector('.card-grid')).toBeInTheDocument();
  });

  it('onSortChange handles non-string and null values without crash', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const select = screen.getByLabelText('Sort by');

    // numeric value
    fireEvent.change(select, { target: { value: 123 } });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // null value -> should fallback to name:asc
    fireEvent.change(select, { target: { value: null } });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // undefined
    fireEvent.change(select, { target: { value: undefined } });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    // empty string
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
  });

  it('onSortChange handles missing target gracefully', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    const instance = new App();
    instance.setState = jest.fn();
    expect(() => instance.onSortChange(null)).not.toThrow();
    expect(() => instance.onSortChange({})).not.toThrow();
    expect(() => instance.onSortChange({ target: null })).not.toThrow();
    expect(() => instance.onSortChange({ target: {} })).not.toThrow();
    expect(() => instance.onSortChange({ target: { value: null } })).not.toThrow();
    expect(() => instance.onSortChange({ target: { value: undefined } })).not.toThrow();
    expect(() => instance.onSortChange({ target: { value: '' } })).not.toThrow();
    expect(instance.setState).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
