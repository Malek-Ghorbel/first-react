import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RobotModal from './RobotModal';

describe('RobotModal', () => {
  const mockRobot = {
    id: 1,
    name: 'Leanne Graham',
    email: 'leanne@example.com'
  };

  it('renders robot details', () => {
    render(<RobotModal robot={mockRobot} onClose={() => {}} />);
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.getByText('leanne@example.com')).toBeInTheDocument();
    expect(screen.getByText('ID: 1')).toBeInTheDocument();
  });

  it('renders robot avatar with correct URL', () => {
    render(<RobotModal robot={mockRobot} onClose={() => {}} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://robohash.org/1?size=200x200');
  });

  it('has correct dialog attributes', () => {
    render(<RobotModal robot={mockRobot} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={mockRobot} onClose={onClose} />);
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={mockRobot} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={mockRobot} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when modal content is clicked', () => {
    const onClose = jest.fn();
    render(<RobotModal robot={mockRobot} onClose={onClose} />);
    const modalContent = screen.getByText('Leanne Graham');
    fireEvent.click(modalContent);
    expect(onClose).not.toHaveBeenCalled();
  });
});
