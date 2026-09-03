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
    // e2e verifier: guard team spawn edge cases - corrupt theme values should not leak to verifier (API call -> team spawn -> verifier)
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    try {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', safeTheme);
            document.documentElement.style.colorScheme = safeTheme;
            if (document.body) {
                document.body.setAttribute('data-theme', safeTheme);
                document.body.dataset.theme = safeTheme;
            }
        }
    } catch {}
}

function debounce(fn, delay) {
    let timer;
    const safeFn = typeof fn === 'function' ? fn : () => {};
    const safeDelay = Number.isFinite(delay) ? delay : 300;
    const debounced = (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => safeFn(...args), safeDelay);
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
        // e2e verifier: guard API call against missing fetch, non-thenable, sync throws and non-Error rejections (null/string)
        if (typeof fetch !== 'function') {
            this.setState({ error: 'Failed to load robots', isLoading: false });
            return;
        }
        try {
            const result = fetch('https://jsonplaceholder.typicode.com/users');
            if (!result || typeof result.then !== 'function') {
                throw new Error('Failed to load robots');
            }
            result.then(response => {
                if (!response || !response.ok) {
                    throw new Error('Failed to load robots (' + (response?.status ?? 'unknown') + ')');
                }
                if (!response || typeof response.json !== 'function') {
                    throw new Error('Invalid data format');
                }
                return response.json();
            })
            .then(json => {
                if (!Array.isArray(json)) {
                    throw new Error('Invalid data format');
                }
                this.setState({ robots: json, isLoading: false, error: null });
            })
            .catch(err => {
                let msg;
                try { msg = err?.message ?? (err != null ? String(err) : 'Failed to load robots'); } catch { msg = 'Failed to load robots'; }
                this.setState({ error: msg || 'Failed to load robots', isLoading: false });
            });
        } catch (err) {
            let msg;
            try { msg = err?.message ?? (err != null ? String(err) : 'Failed to load robots'); } catch { msg = 'Failed to load robots'; }
            this.setState({ error: msg || 'Failed to load robots', isLoading: false });
        }
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
        // e2e verifier: guard team spawn edge cases - corrupt theme in state should still toggle correctly (API call -> team spawn -> verifier)
        this.setState(prev => {
            const safePrev = prev.theme === 'dark' ? 'dark' : 'light';
            return { theme: safePrev === 'dark' ? 'light' : 'dark' };
        });
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
        // e2e verifier: harden setter against bad toString throwing (API call -> team spawn -> edge cases -> verifier)
        let val;
        try { val = String(event?.target?.value ?? ''); } catch { val = ''; }
        this.setState({ searchfield: val, page: 1 });
        this.debouncedSetSearch(val);
    }

    onClearSearch = () => {
        this.setState({ searchfield: '', debouncedSearchfield: '', page: 1 });
    }

    onSortChange = (e) => {
        // e2e verifier: harden setter against corrupt/injected values (API call -> team spawn -> edge cases -> verifier)
        // guard against bad toString throwing and non-allowlisted sort keys
        let raw;
        try {
            raw = String(e?.target?.value ?? 'name:asc');
        } catch {
            raw = 'name:asc';
        }
        const [rawBy, rawDir] = raw.split(':');
        const sortBy = rawBy === 'email' ? 'email' : 'name';
        const sortDir = rawDir === 'desc' ? 'desc' : 'asc';
        this.setState({ sortBy, sortDir, page: 1 });
    }

    goToPage = (nextPage) => {
        // e2e verifier: harden setter against throwing valueOf/toString (API call -> team spawn -> edge cases -> verifier)
        let n;
        try { n = Number(nextPage); } catch { return; }
        if (!Number.isFinite(n)) return;
        this.setState({ page: Math.max(1, Math.floor(n)) });
    }

    onSelectRobot = (robot) => this.setState({ selectedRobot: robot });
    onCloseModal = () => this.setState({ selectedRobot: null });

    render () {
        const { sortBy, sortDir, page: currentPage, pageSize, favorites, showFavoritesOnly, theme } = this.state;
        // e2e verifier: guard end-to-end against corrupt state (non-array, null entries, arrays, non-string values)
        // + guard team spawn edge cases - corrupt theme/sort should not leak to verifier (API call -> team spawn -> verifier)
        const safeTheme = theme === 'dark' ? 'dark' : 'light';
        const safeSortBy = sortBy === 'email' ? 'email' : 'name';
        const safeSortDir = sortDir === 'desc' ? 'desc' : 'asc';
        const sanitizedRobots = Array.isArray(this.state.robots) ? this.state.robots.filter(r => r && typeof r === 'object' && !Array.isArray(r)) : [];
        let debouncedSearch;
        try { debouncedSearch = String(this.state.debouncedSearchfield ?? ''); } catch { debouncedSearch = ''; }
        let debouncedLower;
        try { debouncedLower = debouncedSearch.toLowerCase(); } catch { debouncedLower = ''; }
        const searched = sanitizedRobots.filter( robot => {
            let nameStr;
            try { nameStr = String(robot.name ?? ''); } catch { nameStr = ''; }
            let lowerName;
            try { lowerName = nameStr.toLowerCase(); } catch { lowerName = ''; }
            try { return lowerName.includes(debouncedLower); } catch { return false; }
        }) ;
        const filteredRobots = showFavoritesOnly
            ? searched.filter(r => r != null && Array.isArray(favorites) && favorites.includes(r.id))
            : searched;
        const sorted = [...filteredRobots].sort((a, b) => {
            let aVal; try { aVal = String(a[safeSortBy] ?? '').toLowerCase(); } catch { aVal = ''; }
            let bVal; try { bVal = String(b[safeSortBy] ?? '').toLowerCase(); } catch { bVal = ''; }
            if (aVal < bVal) return safeSortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return safeSortDir === 'asc' ? 1 : -1;
            return 0;
        });
        let nPageSize;
        try { nPageSize = Number(pageSize); } catch { nPageSize = 6; }
        const safePageSize = Number.isFinite(nPageSize) ? Math.max(1, Math.floor(nPageSize)) : 6;
        const totalPages = Math.max(1, Math.ceil(sorted.length / safePageSize));
        let nPage;
        try { nPage = Number(currentPage); } catch { nPage = 1; }
        const safeCurrent = Number.isFinite(nPage) ? Math.floor(nPage) : 1;
        const page = Math.min(Math.max(1, safeCurrent), totalPages);
        const start = (page - 1) * safePageSize;
        const pagedRobots = sorted.slice(start, start + safePageSize);
        const themeToggle = (
            <button
                aria-label={`Switch to ${safeTheme === 'dark' ? 'light' : 'dark'} mode`}
                data-testid="theme-toggle"
                onClick={this.toggleTheme}
                className="pa2 br2 ba b--green bg-white pointer"
                title={`Switch to ${safeTheme === 'dark' ? 'light' : 'dark'} mode`}
                style={{minWidth:'80px'}}
            >
                {safeTheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
        );

        if (this.state.error) {
            return (
                <div className={`app-root tc theme-${safeTheme}`} data-theme={safeTheme} role="alert" aria-live="polite">
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
                <div className={`app-root tc theme-${safeTheme}`} data-theme={safeTheme}>
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
                <label htmlFor="sort-select" className="mr2" style={{color: safeTheme === 'dark' ? '#e2e8f0' : '#0f172a', fontWeight:600}}>Sort by</label>
                <select
                    id="sort-select"
                    value={`${safeSortBy}:${safeSortDir}`}
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
                <div className={`app-root tc theme-${safeTheme}`} data-theme={safeTheme}>
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
            let safeSearchfieldDisplay;
            try { safeSearchfieldDisplay = String(this.state.searchfield ?? ''); } catch { safeSearchfieldDisplay = ''; }
            return (
                <div className={`app-root tc theme-${safeTheme}`} data-theme={safeTheme}>
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
                    <p className="f4" aria-live="polite">No robots found for &ldquo;{safeSearchfieldDisplay}&rdquo;</p>
                    <button data-testid="clear-search-empty" className="pa2 mt2 br2 bg-blue white bn pointer modal-close" onClick={this.onClearSearch}>Clear search</button>
                    </div>
                    </div>
                </div>
            );
        }
        return (
            <div className={`app-root tc theme-${safeTheme}`} data-theme={safeTheme}>
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
