import React from "react"; 

const SearchBox = ({ value, searchChange, onClear }) => {
    return (
        <div className="pa2 relative">
            <label htmlFor="search-robots" className="clip">Search robots</label>
            <input 
            id="search-robots"
            className="pa3 ba b--green bg-lightest-blue w-50"
            type="search" 
            placeholder="Search robots by name"
            aria-label="Search robots by name"
            value={value}
            onChange={searchChange}
            />
            {value && (
                <button
                aria-label="Clear search"
                className="ml2 pa2 ba b--green bg-white pointer"
                onClick={onClear}
                >
                ×
                </button>
            )}
        </div>
    );
}

export default SearchBox ;
