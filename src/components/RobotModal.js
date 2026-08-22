import React, { useEffect, useRef } from "react";

const RobotModal = ({ robot, onClose }) => {
  const closeRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    if (closeRef.current) {
      closeRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!robot) return null;

  return (
    <div
      className="fixed top-0 left-0 w-100 h-100 bg-black-60 flex items-center justify-center z-999"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white br3 pa4 ma4 relative shadow-5"
        style={{ maxWidth: "400px", width: "90%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          className="absolute top-1 right-2 f3 pointer bg-transparent bn"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>
        <div className="tc">
          <img
            alt={`Robot avatar for ${robot.name}`}
            src={`https://robohash.org/${robot.id}?size=200x200`}
            className="br-100 pa1 ba b--light-silver mb2"
          />
          <h2 id="modal-title" className="f3 mb1">
            {robot.name}
          </h2>
          <p className="f5 gray mb1">{robot.email}</p>
          <p className="f6 silver">ID: {robot.id}</p>
        </div>
      </div>
    </div>
  );
};

export default RobotModal;
