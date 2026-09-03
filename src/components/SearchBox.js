import React from "react"; 

const SearchBox = ({ value, searchChange, onClear, hideClear }) => {
    return (
        <div className="pa2 search-wrapper relative">
            <label htmlFor="search-robots" className="clip">Search robots</label>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
            </svg>
            <input 
            id="search-robots"
            className="pa3 ba b--green bg-lightest-blue w-50 search-input-modern"
            type="search" 
            placeholder="Search robots by name"
            aria-label="Search robots by name"
            value={value}
            onChange={searchChange}
            />
            {value && !hideClear && (
                <button
                aria-label="Clear search"
                data-testid="search-clear-btn"
                className="ml2 pa2 ba b--green bg-white pointer search-clear"
                onClick={onClear}
                >
                ×
                </button>
            )}
        </div>
    );
}

export default SearchBox ;
