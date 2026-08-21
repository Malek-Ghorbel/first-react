import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBox from './SearchBox';

describe('SearchBox', () => {
  const defaultProps = {
    value: '',
    searchChange: jest.fn(),
    onClear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an input with accessible label', () => {
    render(<SearchBox {...defaultProps} />);
    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('aria-label', 'Search robots by name');
    expect(input).toHaveAttribute('id', 'search-robots');
    const label = screen.getByText('Search robots');
    expect(label).toHaveAttribute('for', 'search-robots');
  });

  it('displays the controlled value', () => {
    render(<SearchBox {...defaultProps} value="Leanne" />);
    const input = screen.getByRole('searchbox');
    expect(input).toHaveValue('Leanne');
  });

  it('calls searchChange on input', () => {
    const searchChange = jest.fn();
    render(<SearchBox {...defaultProps} searchChange={searchChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } });
    expect(searchChange).toHaveBeenCalledTimes(1);
  });

  it('hides clear button when value is empty', () => {
    render(<SearchBox {...defaultProps} value="" />);
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
  });

  it('shows clear button when value is non-empty', () => {
    render(<SearchBox {...defaultProps} value="test" />);
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', () => {
    const onClear = jest.fn();
    render(<SearchBox {...defaultProps} value="test" onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
