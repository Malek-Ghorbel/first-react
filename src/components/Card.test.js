import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  it('renders descriptive alt text with robot name', () => {
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Robot avatar for Leanne Graham');
  });

  it('renders the robohash image with correct URL', () => {
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://robohash.org/1?size=200x200');
  });

  it('displays name and email', () => {
    render(<Card id={1} name="Leanne Graham" email="leanne@example.com" />);
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.getByText('leanne@example.com')).toBeInTheDocument();
  });
});
