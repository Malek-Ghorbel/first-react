import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const mockRobots = [
  { id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' },
  { id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' },
  { id: 3, name: 'Clementine Bauch', email: 'Nathan@yesenia.net' },
  { id: 4, name: 'Patricia Lebsack', email: 'Julianne.OConner@kory.org' },
  { id: 5, name: 'Chelsey Dietrich', email: 'Lucio_Hettinger@annie.ca' },
  { id: 6, name: 'Mrs. Dennis Schulist', email: 'Karley_Dach@jasper.info' },
  { id: 7, name: 'Kurtis Weissnat', email: 'Telly.Hoeger@billy.biz' },
  { id: 8, name: 'Nicholas Runolfsdottir V', email: 'Sherwood@rosamond.me' },
];

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }));
}

describe('App sorting and pagination', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('shows sort control default Name A→Z and page 1', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Chelsey Dietrich')).toBeInTheDocument());
    const sel = screen.getByLabelText('Sort by');
    expect(sel.value).toBe('name:asc');
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
  });

  it('sorts by Name A→Z by default (first card is Chelsey Dietrich)', async () => {
    mockFetchSuccess(mockRobots);
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText('Chelsey Dietrich')).toBeInTheDocument());
    const names = [...container.querySelectorAll('h2')].map(n => n.textContent);
    const sorted = [...names].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
    expect(names).toEqual(sorted);
  });

  it('changing sort to Z→A reorders and resets to page 1', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText('Chelsey Dietrich')).toBeInTheDocument());
    // go to page 2
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
    // change sort to Z->A should reset to page 1
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name:desc' }});
    await waitFor(() => expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument());
    expect(screen.getByText('Patricia Lebsack')).toBeInTheDocument();
  });

  it('pagination Prev/Next disabled at bounds', async () => {
    mockFetchSuccess(mockRobots);
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument());
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });
});
