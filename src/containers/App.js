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
        this.setState(prev => ({ showFavoritesOnly: !prev.showFavoritesOnly }));
    };

    onSearchChange = (event) => {
        const val = event.target.value;
        this.setState({ searchfield: val });
        this.debouncedSetSearch(val);
    }

    onClearSearch = () => {
        this.setState({ searchfield: '', debouncedSearchfield: '' });
    }

    onSelectRobot = (robot) => this.setState({ selectedRobot: robot });
    onCloseModal = () => this.setState({ selectedRobot: null });

    render () {
        const { robots, debouncedSearchfield, searchfield, favorites, showFavoritesOnly } = this.state;
        const searched = robots.filter( robot => {
            return(robot.name.toLowerCase().includes(debouncedSearchfield.toLowerCase())  )
        }) ;
        const filteredRobots = showFavoritesOnly
            ? searched.filter(r => favorites.includes(r.id))
            : searched;

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

        const toolbar = (
            <div className="flex justify-center items-center gap2 mv2">
                <button
                    className={showFavoritesOnly ? 'b--green bg-light-green pa2 ba pointer br2' : 'b--black-20 pa2 ba pointer br2 bg-white'}
                    onClick={this.toggleFavoritesFilter}
                    aria-pressed={showFavoritesOnly}
                >
                    {showFavoritesOnly ? 'Showing favorites' : 'Show favorites'} ({favorites.length})
                </button>
            </div>
        );

        if (showFavoritesOnly && favorites.length === 0) {
            return (
                <div className="tc">
                    <h1 className="f1">ROBOFRIENDS</h1>
                    <SearchBox
                    value={this.state.searchfield}
                    searchChange={this.onSearchChange}
                    onClear={this.onClearSearch}
                    />
                    {toolbar}
                    <p className="f4 gray">No favorites yet — tap ☆ on a card to save one.</p>
                </div>
            );
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
                    {toolbar}
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
                {toolbar}
                <Scroll>
                    <ErrorBoundry>
                        <CardList robots={filteredRobots} favorites={favorites} onToggleFavorite={this.toggleFavorite} onSelect={this.onSelectRobot} />
                    </ErrorBoundry>
                </Scroll>
                {this.state.selectedRobot && (
                    <RobotModal robot={this.state.selectedRobot} onClose={this.onCloseModal} />
                )}
            </div>
        );
    }
}

export default App ;
