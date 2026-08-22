import React, { useEffect } from 'react';

const RobotModal = ({ robot, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed top-0 left-0 w-100 h-100 bg-black-50 flex items-center justify-center z-999"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white br3 pa4 shadow-5 relative" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute top1 right2 f2 pointer bg-transparent bn"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>
        <div className="tc">
          <img
            alt={`Robot avatar for ${robot.name}`}
            src={`https://robohash.org/${robot.id}?size=200x200`}
          />
          <h2 id="modal-title" className="f3">{robot.name}</h2>
          <p className="f5 gray">{robot.email}</p>
          <p className="f6">ID: {robot.id}</p>
        </div>
      </div>
    </div>
  );
};

export default RobotModal;
