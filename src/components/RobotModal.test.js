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

  it('renders robot details in modal', () => {
    render(<RobotModal {...defaultProps} />);
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.getByText('leanne@example.com')).toBeInTheDocument();
    expect(screen.getByText('ID: 1')).toBeInTheDocument();
  });

  it('renders large avatar with correct URL', () => {
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

  it('calls onClose when Close button is clicked', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside modal content', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    const modalContent = screen.getByText('Leanne Graham');
    fireEvent.click(modalContent);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks body scroll when open', () => {
    render(<RobotModal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('unlocks body scroll when closed', () => {
    const { unmount } = render(<RobotModal {...defaultProps} />);
    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });
});
