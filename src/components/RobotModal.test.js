import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RobotModal from './RobotModal';

const robot = { id: 1, name: 'Leanne Graham', email: 'leanne@example.com' };

describe('RobotModal', () => {
  it('renders large avatar, name, email and ID', () => {
    render(<RobotModal robot={robot} onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.getByText('leanne@example.com')).toBeInTheDocument();
    expect(screen.getByText(/ID: 1/)).toBeInTheDocument();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://robohash.org/1?size=200x200');
  });

  it('has aria-modal and role dialog', () => {
    render(<RobotModal robot={robot} onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Close button', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={robot} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={robot} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking modal content', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={robot} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Esc', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={robot} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('focuses close button on open', () => {
    render(<RobotModal robot={robot} onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
  });
});
