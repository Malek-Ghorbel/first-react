import React from 'react' ;

const Card = ({id, name, email, isFavorite, onToggleFavorite, onSelect}) => {
    const ref = React.useRef(null);
    React.useEffect(() => {
        const el = ref.current; if (!el) return; const obs = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.1 }); obs.observe(el); return () => obs.disconnect();
    }, []);
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onSelect) onSelect();
        }
    };
    return (
        <div
            ref={ref}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${name}`}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className="bg-light-green dib br3 ma2 grow shadow-5 pointer relative hover-lift card-animate"
        >
            {onToggleFavorite && (
                <button
                    aria-label={isFavorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
                    aria-pressed={isFavorite}
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(id); }}
                    className="absolute top-0 right-0 ma2 bg-white br-100 ba b--black-10 pointer"
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    {isFavorite ? '★' : '☆'}
                </button>
            )}
            <img alt={`Robot avatar for ${name}`} src={`https://robohash.org/${id}?size=200x200`} />
            <div>
                <h2> {name} </h2> 
                <p> {email} </p>
            </div>
        </div>
    )
}

export default Card ;
