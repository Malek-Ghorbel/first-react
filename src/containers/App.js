import React , {Component} from "react";
import CardList from "../components/CardList";
import SearchBox from "../components/SearchBox";
import "./app.css" ;
import Scroll from "../components/Scroll";
import ErrorBoundry from "./ErrorBoundry";
import RobotModal from "../components/RobotModal";

const FAV_KEY = 'robofriends:favorites';
const THEME_KEY = 'robofriends:theme';

function getInitialTheme() {
    try {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {}
    try {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
    } catch {}
    return 'light';
}

function applyTheme(theme) {
    try {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.style.colorScheme = theme;
            if (document.body) {
                document.body.setAttribute('data-theme', theme);
                document.body.dataset.theme = theme;
            }
        }
    } catch {}
}

function debounce(fn, delay) {
    let timer;
    const debounced = (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
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
            showFavoritesOnly: false,
            theme: getInitialTheme()
        }
        this.debouncedSetSearch = debounce((val) => {
            this.setState({ debouncedSearchfield: val });
        }, 300);
        applyTheme(this.state.theme);
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
        .then(json => {
            if (!Array.isArray(json)) {
                throw new Error('Invalid data format');
            }
            this.setState({ robots: json, isLoading: false, error: null });
        })
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
        try {
            const storedTheme = localStorage.getItem(THEME_KEY);
            if ((storedTheme === 'light' || storedTheme === 'dark') && storedTheme !== this.state.theme) {
                this.setState({ theme: storedTheme });
            } else {
                applyTheme(this.state.theme);
            }
        } catch {
            applyTheme(this.state.theme);
        }
        this.fetchRobots();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.favorites !== this.state.favorites) {
            try {
                localStorage.setItem(FAV_KEY, JSON.stringify(this.state.favorites));
            } catch {}
        }
        if (prevState.theme !== this.state.theme) {
            try {
                localStorage.setItem(THEME_KEY, this.state.theme);
            } catch {}
            applyTheme(this.state.theme);
        }
    }

    componentWillUnmount() {
        if (this.debouncedSetSearch && this.debouncedSetSearch.cancel) {
            this.debouncedSetSearch.cancel();
        }
    }


    toggleTheme = () => {
        this.setState(prev => ({ theme: prev.theme === 'dark' ? 'light' : 'dark' }));
    };

    toggleFavorite = (id) => {
        this.setState(prev => {
            const favs = Array.isArray(prev.favorites) ? prev.favorites : [];
            return {
                favorites: favs.includes(id)
                    ? favs.filter(x => x !== id)
                    : [...favs, id]
            };
        });
    };

    toggleFavoritesFilter = () => {
        this.setState(prev => ({ showFavoritesOnly: !prev.showFavoritesOnly, page: 1 }));
    };

    onSearchChange = (event) => {
        const val = String(event?.target?.value ?? '');
        this.setState({ searchfield: val, page: 1 });
        this.debouncedSetSearch(val);
    }

    onClearSearch = () => {
        this.setState({ searchfield: '', debouncedSearchfield: '', page: 1 });
    }

    onSortChange = (e) => {
        const raw = String(e?.target?.value ?? 'name:asc');
        const [sortBy, sortDir] = raw.split(':');
        this.setState({ sortBy: sortBy || 'name', sortDir: sortDir || 'asc', page: 1 });
    }

    goToPage = (nextPage) => {
        this.setState({ page: nextPage });
    }

    onSelectRobot = (robot) => this.setState({ selectedRobot: robot });
    onCloseModal = () => this.setState({ selectedRobot: null });

    render () {
        const { sortBy, sortDir, page: currentPage, pageSize, favorites, showFavoritesOnly, theme } = this.state;
        // e2e verifier: guard end-to-end against corrupt state (non-array, null entries, arrays, non-string values)
        const sanitizedRobots = Array.isArray(this.state.robots) ? this.state.robots.filter(r => r && typeof r === 'object' && !Array.isArray(r)) : [];
        const debouncedSearch = String(this.state.debouncedSearchfield ?? '');
        const searched = sanitizedRobots.filter( robot => {
            return(String(robot.name ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())  )
        }) ;
        const filteredRobots = showFavoritesOnly
            ? searched.filter(r => r != null && Array.isArray(favorites) && favorites.includes(r.id))
            : searched;
        const sorted = [...filteredRobots].sort((a, b) => {
            const aVal = String(a[sortBy] ?? '').toLowerCase();
            const bVal = String(b[sortBy] ?? '').toLowerCase();
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
        const page = Math.min(currentPage, totalPages);
        const start = (page - 1) * pageSize;
        const pagedRobots = sorted.slice(start, start + pageSize);
        const themeToggle = (
            <button
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                data-testid="theme-toggle"
                onClick={this.toggleTheme}
                className="pa2 br2 ba b--green bg-white pointer"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                style={{minWidth:'80px'}}
            >
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
        );

        if (this.state.error) {
            return (
                <div className={`app-root tc theme-${theme}`} data-theme={theme} role="alert" aria-live="polite">
                    <header className="app-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h1 className="f1">ROBOFRIENDS</h1>
                        {themeToggle}
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
                <div className={`app-root tc theme-${theme}`} data-theme={theme}>
                    <header className="app-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h1 className="f1">ROBOFRIENDS</h1>
                        {themeToggle}
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

        const favoritesCount = Array.isArray(favorites) ? favorites.length : 0;
        const favToolbar = (
            <div className="toolbar">
                <button
                    className={showFavoritesOnly ? 'toolbar-btn toolbar-btn-active' : 'toolbar-btn'}
                    onClick={this.toggleFavoritesFilter}
                    aria-pressed={showFavoritesOnly}
                >
                    {showFavoritesOnly ? 'Showing favorites' : 'Show favorites'} ({favoritesCount})
                </button>
            </div>
        );

        const sortToolbar = (
            <div className="toolbar">
                <label htmlFor="sort-select" className="mr2" style={{color: theme === 'dark' ? '#e2e8f0' : '#0f172a', fontWeight:600}}>Sort by</label>
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

        if (showFavoritesOnly && favoritesCount === 0) {
            return (
                <div className={`app-root tc theme-${theme}`} data-theme={theme}>
                    <header className="app-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h1 className="f1">ROBOFRIENDS</h1>
                        {themeToggle}
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
                <div className={`app-root tc theme-${theme}`} data-theme={theme}>
                    <header className="app-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h1 className="f1">ROBOFRIENDS</h1>
                        {themeToggle}
                    </header>
                    <div className="app-main">
                    <SearchBox
                    value={this.state.searchfield}
                    searchChange={this.onSearchChange}
                    onClear={this.onClearSearch}
                    hideClear
                    />
                    {favToolbar}
                    {sortToolbar}
                    <div className="empty-state">
                    <p className="f4" aria-live="polite">No robots found for &ldquo;{this.state.searchfield}&rdquo;</p>
                    <button data-testid="clear-search-empty" className="pa2 mt2 br2 bg-blue white bn pointer modal-close" onClick={this.onClearSearch}>Clear search</button>
                    </div>
                    </div>
                </div>
            );
        }
        return (
            <div className={`app-root tc theme-${theme}`} data-theme={theme}>
                <header className="app-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h1 className="f1">ROBOFRIENDS</h1>
                    {themeToggle}
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
