import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RobotModal from './RobotModal';

describe('RobotModal', () => {
  const defaultProps = {
    robot: {
      id: 1,
      name: 'Leanne Graham',
      email: 'leanne@example.com',
    },
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders robot name, email, and ID', () => {
    render(<RobotModal {...defaultProps} />);
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.getByText('leanne@example.com')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders robot avatar with correct URL', () => {
    render(<RobotModal {...defaultProps} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://robohash.org/1?size=200x200');
    expect(img).toHaveAttribute('alt', 'Robot avatar for Leanne Graham');
  });

  it('has dialog role and aria-modal', () => {
    render(<RobotModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Leanne Graham'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
