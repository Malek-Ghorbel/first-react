import React , {Component} from "react";
import CardList from "../components/CardList";
import SearchBox from "../components/SearchBox";
import "./app.css" ;
import Scroll from "../components/Scroll";
import ErrorBoundry from "./ErrorBoundry";
import RobotModal from "../components/RobotModal";

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
            selectedRobot: null
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
        this.fetchRobots();
    }

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
        const { sortBy, sortDir, page: currentPage, pageSize } = this.state;
        const filteredRobots = this.state.robots.filter( robot => {
            return(robot.name.toLowerCase().includes(this.state.debouncedSearchfield.toLowerCase())  )
        }) ;
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
                <div className="tc" role="alert" aria-live="polite">
                    <h1 className="f1">ROBOFRIENDS</h1>
                    <p className="f4 red">Error: {this.state.error}</p>
                    <button className="pa2 mt2 br2 bg-blue white bn pointer" onClick={this.fetchRobots}>Retry</button>
                </div>
            );
        }
        if (this.state.isLoading) {
            return (<h1 aria-live="polite">loading ...</h1>)
        }
        if (!filteredRobots.length) {
            return (
                <div className="tc">
                    <h1 className="f1">ROBOFRIENDS</h1>
                    <SearchBox
                    value={this.state.searchfield}
                    searchChange={this.onSearchChange}
                    onClear={this.onClearSearch}
                    />
                    <p className="f4 gray" aria-live="polite">No robots found for &ldquo;{this.state.searchfield}&rdquo;</p>
                    <button className="pa2 mt2 br2 bg-blue white bn pointer" onClick={this.onClearSearch}>Clear search</button>
                </div>
            );
        }
        return (
            <div className="tc">
                <h1 className="f1">ROBOFRIENDS</h1>
                <SearchBox
                value={this.state.searchfield}
                searchChange={this.onSearchChange}
                onClear={this.onClearSearch}
                />
                <div className="flex flex-wrap justify-center items-center gap2 mv2">
                    <label htmlFor="sort-select" className="mr2">Sort by</label>
                    <select
                        id="sort-select"
                        value={`${sortBy}:${sortDir}`}
                        onChange={this.onSortChange}
                        className="pa2 ba b--green bg-white"
                    >
                        <option value="name:asc">Name A→Z</option>
                        <option value="name:desc">Name Z→A</option>
                        <option value="email:asc">Email A→Z</option>
                        <option value="email:desc">Email Z→A</option>
                    </select>
                </div>
                <Scroll>
                    <ErrorBoundry>
                        <CardList robots={pagedRobots} onSelect={this.onSelectRobot} />
                    </ErrorBoundry>
                </Scroll>
                <div className="flex justify-center items-center gap3 mv3">
                    <button onClick={() => this.goToPage(page - 1)} disabled={page === 1} aria-label="Previous page" className="pa2 br2 bg-light-green ba b--green pointer">Prev</button>
                    <span aria-live="polite" className="mh2">Page {page} of {totalPages}</span>
                    <button onClick={() => this.goToPage(page + 1)} disabled={page === totalPages} aria-label="Next page" className="pa2 br2 bg-light-green ba b--green pointer">Next</button>
                </div>
                {this.state.selectedRobot && (
                    <RobotModal robot={this.state.selectedRobot} onClose={this.onCloseModal} />
                )}
            </div>
        );
    }
}

export default App ;
