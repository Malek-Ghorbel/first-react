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
    document.body.style.overflow = '';
  });

  it('renders robot name, email, and ID', () => {
    render(<RobotModal {...defaultProps} />);
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.getByText('leanne@example.com')).toBeInTheDocument();
    expect(screen.getByText(/ID: 1/)).toBeInTheDocument();
  });

  it('renders large robohash avatar', () => {
    render(<RobotModal {...defaultProps} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://robohash.org/1?size=200x200');
    expect(img).toHaveAttribute('alt', 'Robot avatar for Leanne Graham');
  });

  it('has role dialog and aria-modal', () => {
    render(<RobotModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('renders Close button', () => {
    render(<RobotModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when modal content is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.firstChild.firstChild);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(<RobotModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks background scroll while open', async () => {
    render(<RobotModal {...defaultProps} />);
    await screen.findByRole('dialog');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores background scroll on close', () => {
    const { unmount } = render(<RobotModal {...defaultProps} />);
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('returns null when robot is null', () => {
    const { container } = render(<RobotModal robot={null} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
