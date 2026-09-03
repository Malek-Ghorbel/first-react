import React, { useEffect, useRef } from 'react';

const RobotModal = ({ robot, onClose }) => {
    const closeBtnRef = useRef(null);

    useEffect(() => {
        if (closeBtnRef.current) {
            closeBtnRef.current.focus();
        }
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed top-0 left-0 w-100 h-100 bg-black-60 flex items-center justify-center z-999 modal-backdrop"
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
            onClick={handleBackdropClick}
            data-testid="modal-backdrop"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="robot-modal-title"
                className="bg-white br3 pa4 tc shadow-5 relative modal-dialog"
                style={{ maxWidth: '400px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    alt={`Robot avatar for ${robot.name}`}
                    src={`https://robohash.org/${robot.id}?size=200x200`}
                    style={{ width: '200px', height: '200px' }}
                    loading="lazy"
                />
                <h2 id="robot-modal-title">{robot.name}</h2>
                <p>{robot.email}</p>
                <p className="gray">ID: {robot.id}</p>
                <button
                    ref={closeBtnRef}
                    onClick={onClose}
                    className="pa2 mt2 br2 bg-blue white bn pointer modal-close"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default RobotModal;
