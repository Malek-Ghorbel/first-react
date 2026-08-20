import React , {Component} from "react";
import CardList from "../components/CardList";
import SearchBox from "../components/SearchBox";
import "./app.css" ;
import Scroll from "../components/Scroll";
import ErrorBoundry from "./ErrorBoundry";

class App extends Component {
    constructor () {
        super() ;
        this.state = {
            robots : [],
            searchfield :'',
            isLoading: true,
            error: null
        }
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
        this.setState({searchfield : event.target.value }) ;
    }

    render () {
        const filteredRobots = this.state.robots.filter( robot => {
            return(robot.name.toLowerCase().includes(this.state.searchfield.toLowerCase())  )
        }) ;
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
                    <SearchBox searchChange={this.onSearchChange} />
                    <p className="f4 gray" aria-live="polite">No robots found for &ldquo;{this.state.searchfield}&rdquo;</p>
                    <button className="pa2 mt2 br2 bg-blue white bn pointer" onClick={() => this.setState({ searchfield: '' })}>Clear search</button>
                </div>
            );
        }
        return (
            <div className="tc">
                <h1 className="f1">ROBOFRIENDS</h1>
                <SearchBox searchChange={this.onSearchChange} />
                <Scroll>
                    <ErrorBoundry>
                        <CardList robots={filteredRobots} />
                    </ErrorBoundry>
                </Scroll>
            </div>
        );
    }
}

export default App ;
