import React from 'react' ;

const Card = ({id, name, email, onSelect}) => {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
        }
    };
    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`View details for ${name}`}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className="bg-light-green dib br3 ma2 grow shadow-5 pointer"
        >
            <img alt={`Robot avatar for ${name}`} src={`https://robohash.org/${id}?size=200x200`} />
            <div>
                <h2> {name} </h2> 
                <p> {email} </p>
            </div>
        </div>
    )
}

export default Card ;
