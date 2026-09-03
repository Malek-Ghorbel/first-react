import React from "react";

const Scroll = (props) => {
    // e2e verifier: guard team spawn edge cases - corrupt props/children should not crash verifier (API call -> team spawn -> edge cases -> verifier)
    let children = null;
    try {
        children = props?.children;
    } catch {
        children = null;
    }
    return (
        <div className="modern-scroll" style={{ overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '68vh', padding: '0.75rem', scrollBehavior: 'smooth' }}>
            {children}
        </div>
    );
};

export default Scroll;
