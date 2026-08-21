import React, { useEffect, useRef } from 'react';

const RobotModal = ({ robot, onClose }) => {
    const closeRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        if (closeRef.current) {
            closeRef.current.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed top-0 left-0 w-100 h-100 bg-black-60 flex items-center justify-center z-999"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="bg-white br3 pa4 ma4 max-w-50 w-100 shadow-5">
                <h2 id="modal-title" className="f3 mt0">{robot.name}</h2>
                <img
                    alt={`Robot avatar for ${robot.name}`}
                    src={`https://robohash.org/${robot.id}?size=200x200`}
                    className="db mx-auto mb3"
                />
                <p className="f4"><strong>Email:</strong> {robot.email}</p>
                <p className="f4"><strong>ID:</strong> {robot.id}</p>
                <button
                    ref={closeRef}
                    onClick={onClose}
                    className="pa2 mt2 br2 bg-blue white bn pointer"
                    aria-label="Close modal"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default RobotModal;
