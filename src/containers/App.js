import React , {Component} from "react";
import CardList from "../components/CardList";
import SearchBox from "../components/SearchBox";
import "./app.css" ;
import Scroll from "../components/Scroll";
import ErrorBoundry from "./ErrorBoundry";
import RobotModal from "../components/RobotModal";

const FAV_KEY = 'robofriends:favorites';

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

class App extends Component {
    constructor () {
        super() ;
        this.state = {
            robots : [],
            searchfield :'',
            debouncedSearchfield :'',
            isLoading: true,
            error: null,
            sortBy: 'name',
            sortDir: 'asc',
            page: 1,
            pageSize: 6,
            selectedRobot: null,
            favorites: [],
            showFavoritesOnly: false
        }
        this.debouncedSetSearch = debounce((val) => {
            this.setState({ debouncedSearchfield: val });
        }, 300);
    }

    fetchRobots = () => {
        this.setState({ isLoading: true, error: null });
        fetch('https://jsonplaceholder.typicode.com/users')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load robots (' + response.status + ')');
            }
            return response.json();
        })
        .then(json => this.setState({ robots: json, isLoading: false, error: null }))
        .catch(err => this.setState({ error: err.message || 'Failed to load robots', isLoading: false }));
    }

    componentDidMount () {
        try {
            const raw = localStorage.getItem(FAV_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    this.setState({ favorites: parsed });
                }
            }
        } catch {}
        this.fetchRobots();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.favorites !== this.state.favorites) {
            try {
                localStorage.setItem(FAV_KEY, JSON.stringify(this.state.favorites));
            } catch {}
        }
    }

    toggleFavorite = (id) => {
        this.setState(prev => ({
            favorites: prev.favorites.includes(id)
                ? prev.favorites.filter(x => x !== id)
                : [...prev.favorites, id]
        }));
    };

    toggleFavoritesFilter = () => {
        this.setState(prev => ({ showFavoritesOnly: !prev.showFavoritesOnly, page: 1 }));
    };

    onSearchChange = (event) => {
        const val = event.target.value;
        this.setState({ searchfield: val, page: 1 });
        this.debouncedSetSearch(val);
    }

    onClearSearch = () => {
        this.setState({ searchfield: '', debouncedSearchfield: '', page: 1 });
    }

    onSortChange = (e) => {
        const [sortBy, sortDir] = e.target.value.split(':');
        this.setState({ sortBy, sortDir, page: 1 });
    }

    goToPage = (nextPage) => {
        this.setState({ page: nextPage });
    }

    onSelectRobot = (robot) => this.setState({ selectedRobot: robot });
    onCloseModal = () => this.setState({ selectedRobot: null });

    render () {
        const { sortBy, sortDir, page: currentPage, pageSize, favorites, showFavoritesOnly } = this.state;
        const searched = this.state.robots.filter( robot => {
            return(robot.name.toLowerCase().includes(this.state.debouncedSearchfield.toLowerCase())  )
        }) ;
        const filteredRobots = showFavoritesOnly
            ? searched.filter(r => favorites.includes(r.id))
            : searched;
        const sorted = [...filteredRobots].sort((a, b) => {
            const aVal = (a[sortBy] || '').toLowerCase();
            const bVal = (b[sortBy] || '').toLowerCase();
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
        const page = Math.min(currentPage, totalPages);
        const start = (page - 1) * pageSize;
        const pagedRobots = sorted.slice(start, start + pageSize);
        if (this.state.error) {
            return (
                <div className="app-root tc" role="alert" aria-live="polite">
                    <header className="app-header">
                        <h1 className="f1">ROBOFRIENDS</h1>
                    </header>
                    <div className="app-main">
                    <p className="f4 red">Error: {this.state.error}</p>
                    <button className="pa2 mt2 br2 bg-blue white bn pointer modal-close" onClick={this.fetchRobots}>Retry</button>
                    </div>
                </div>
            );
        }
        if (this.state.isLoading) {
            return (
                <div className="app-root tc">
                    <header className="app-header">
                        <h1 className="f1">ROBOFRIENDS</h1>
                    </header>
                    <div className="loading-container">
                        <h1 aria-live="polite" className="loading-title f1">loading ...</h1>
                        <div className="skeleton-grid" aria-hidden="true">
                            <div className="skeleton-card"></div>
                            <div className="skeleton-card"></div>
                            <div className="skeleton-card"></div>
                            <div className="skeleton-card"></div>
                            <div className="skeleton-card"></div>
                            <div className="skeleton-card"></div>
                        </div>
                    </div>
                </div>
            )
        }

        const favToolbar = (
            <div className="toolbar">
                <button
                    className={showFavoritesOnly ? 'toolbar-btn toolbar-btn-active' : 'toolbar-btn'}
                    onClick={this.toggleFavoritesFilter}
                    aria-pressed={showFavoritesOnly}
                >
                    {showFavoritesOnly ? 'Showing favorites' : 'Show favorites'} ({favorites.length})
                </button>
            </div>
        );

        const sortToolbar = (
            <div className="toolbar">
                <label htmlFor="sort-select" className="mr2" style={{color:'#e2e8f0', fontWeight:600}}>Sort by</label>
                <select
                    id="sort-select"
                    value={`${sortBy}:${sortDir}`}
                    onChange={this.onSortChange}
                    className="pa2 ba b--green bg-white sort-select"
                >
                    <option value="name:asc">Name A→Z</option>
                    <option value="name:desc">Name Z→A</option>
                    <option value="email:asc">Email A→Z</option>
                    <option value="email:desc">Email Z→A</option>
                </select>
            </div>
        );

        if (showFavoritesOnly && favorites.length === 0) {
            return (
                <div className="app-root tc">
                    <header className="app-header">
                        <h1 className="f1">ROBOFRIENDS</h1>
                    </header>
                    <div className="app-main">
                    <SearchBox
                    value={this.state.searchfield}
                    searchChange={this.onSearchChange}
                    onClear={this.onClearSearch}
                    />
                    {favToolbar}
                    {sortToolbar}
                    <div className="empty-state">
                    <p className="f4">No favorites yet — tap ☆ on a card to save one.</p>
                    </div>
                    </div>
                </div>
            );
        }
        if (!filteredRobots.length) {
            return (
                <div className="app-root tc">
                    <header className="app-header">
                        <h1 className="f1">ROBOFRIENDS</h1>
                    </header>
                    <div className="app-main">
                    <SearchBox
                    value={this.state.searchfield}
                    searchChange={this.onSearchChange}
                    onClear={this.onClearSearch}
                    />
                    {favToolbar}
                    {sortToolbar}
                    <div className="empty-state">
                    <p className="f4" aria-live="polite">No robots found for &ldquo;{this.state.searchfield}&rdquo;</p>
                    <button className="pa2 mt2 br2 bg-blue white bn pointer modal-close" onClick={this.onClearSearch}>Clear search</button>
                    </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="app-root tc">
                <header className="app-header">
                    <h1 className="f1">ROBOFRIENDS</h1>
                </header>
                <div className="app-main">
                <SearchBox
                value={this.state.searchfield}
                searchChange={this.onSearchChange}
                onClear={this.onClearSearch}
                />
                {favToolbar}
                {sortToolbar}
                <Scroll>
                    <ErrorBoundry>
                        <CardList robots={pagedRobots} favorites={favorites} onToggleFavorite={this.toggleFavorite} onSelect={this.onSelectRobot} />
                    </ErrorBoundry>
                </Scroll>
                <div className="pagination">
                    <button onClick={() => this.goToPage(page - 1)} disabled={page === 1} aria-label="Previous page" className="pa2 br2 bg-light-green ba b--green pointer pagination-btn">Prev</button>
                    <span aria-live="polite" className="pagination-info mh2">Page {page} of {totalPages}</span>
                    <button onClick={() => this.goToPage(page + 1)} disabled={page === totalPages} aria-label="Next page" className="pa2 br2 bg-light-green ba b--green pointer pagination-btn">Next</button>
                </div>
                </div>
                {this.state.selectedRobot && (
                    <RobotModal robot={this.state.selectedRobot} onClose={this.onCloseModal} />
                )}
            </div>
        );
    }
}

export default App ;
