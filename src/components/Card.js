import React from 'react' ;

const Card = ({id, name, email, isFavorite, onToggleFavorite, onSelect}) => {
    const displayName = String(name ?? '');
    const displayEmail = String(email ?? '');
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onSelect) onSelect();
        }
    };
    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`View details for ${displayName}`}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className="robo-card bg-light-green dib br3 ma2 grow shadow-5 pointer relative"
        >
            {onToggleFavorite && (
                <button
                    aria-label={isFavorite ? `Remove ${displayName} from favorites` : `Add ${displayName} to favorites`}
                    aria-pressed={isFavorite}
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(id); }}
                    className="favorite-btn absolute top-0 right-0 ma2 bg-white br-100 ba b--black-10 pointer"
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    {isFavorite ? '★' : '☆'}
                </button>
            )}
            <img alt={`Robot avatar for ${displayName}`} src={`https://robohash.org/${id}?size=200x200`} loading="lazy" />
            <div>
                <h2> {displayName} </h2> 
                <p> {displayEmail} </p>
            </div>
        </div>
    )
}

export default Card ;
