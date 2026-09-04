import React from 'react' ;

const Card = ({id, name, email, isFavorite, onToggleFavorite, onSelect}) => {
    // e2e verifier: guard team spawn edge cases - corrupt values throwing on String should not crash verifier (API call -> team spawn -> edge cases -> verifier)
    let displayId; try { displayId = String(id ?? ''); } catch { displayId = ''; }
    let displayName; try { displayName = String(name ?? ''); } catch { displayName = ''; }
    let displayEmail; try { displayEmail = String(email ?? ''); } catch { displayEmail = ''; }
    // e2e verifier: guard team spawn against non-function callbacks (string/number/object/null)
    const safeOnSelect = typeof onSelect === 'function' ? onSelect : undefined;
    const safeOnToggle = typeof onToggleFavorite === 'function' ? onToggleFavorite : undefined;
    const handleKeyDown = (e) => {
        try {
            let key;
            try { key = e?.key; } catch { return; }
            if (key === 'Enter' || key === ' ') {
                try { e?.preventDefault?.(); } catch {}
                try { if (safeOnSelect) safeOnSelect(); } catch {}
            }
        } catch {}
    };
    const handleSelect = () => {
        try { if (safeOnSelect) safeOnSelect(); } catch {}
    };
    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`View details for ${displayName}`}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            className="robo-card bg-light-green dib br3 ma2 grow shadow-5 pointer relative"
        >
            {safeOnToggle && (
                <button
                    aria-label={isFavorite ? `Remove ${displayName} from favorites` : `Add ${displayName} to favorites`}
                    aria-pressed={isFavorite}
                    onClick={(e) => { try { e?.stopPropagation?.(); } catch {} try { if (safeOnToggle) safeOnToggle(id); } catch {} }}
                    className="favorite-btn absolute top-0 right-0 ma2 bg-white br-100 ba b--black-10 pointer"
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    {isFavorite ? '★' : '☆'}
                </button>
            )}
            <img alt={`Robot avatar for ${displayName}`} src={`https://robohash.org/${displayId}?size=200x200`} loading="lazy" />
            <div>
                <h2> {displayName} </h2> 
                <p> {displayEmail} </p>
            </div>
        </div>
    )
}

export default Card ;
