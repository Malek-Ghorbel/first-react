import React, { useEffect, useRef } from 'react';

const RobotModal = ({ robot, onClose }) => {
    const closeButtonRef = useRef(null);

    useEffect(() => {
        if (closeButtonRef.current) {
            closeButtonRef.current.focus();
        }

        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleKeyDown);
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
            <div className="bg-white br3 pa4 ma4 max-w-m w-100 shadow-5">
                <div className="tc">
                    <img
                        alt={`Robot avatar for ${robot.name}`}
                        src={`https://robohash.org/${robot.id}?size=200x200`}
                        className="br3 mb3"
                    />
                    <h2 id="modal-title" className="f3 mb2">{robot.name}</h2>
                    <p className="f4 gray mb1">ID: {robot.id}</p>
                    <p className="f4 mb3">{robot.email}</p>
                    <button
                        ref={closeButtonRef}
                        className="pa2 mt2 br2 bg-blue white bn pointer"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RobotModal;
