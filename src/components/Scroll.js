import React from "react";

const Scroll = (props) => {
    return (
        <div style={{ overflowY: 'auto', border: '1px solid #e0e0e0', maxHeight: '60vh', padding: '0.5rem' }}>
            {props.children} 
        </div>
    ) ;
} ;

export default Scroll ;
