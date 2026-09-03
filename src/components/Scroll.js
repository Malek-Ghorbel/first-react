import React from "react";

const Scroll = (props) => {
    return (
        <div className="modern-scroll" style={{ overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '68vh', padding: '0.75rem', scrollBehavior: 'smooth' }}>
            {props.children} 
        </div>
    ) ;
} ;

export default Scroll ;
