import React , {Component} from "react";
import CardList from "./CardList";
import SearchBox from "./SearchBox";
import "./app.css" ;
import Scroll from "./Scroll";
import ErrorBoundry from "./ErrorBoundry";


class App extends Component {
    constructor () {
        super() ;
        this.state = {
            robots : [],
            searchfield :'' 
        }
    }
    filteredRobots ;

    componentDidMount () {
        fetch('https://jsonplaceholder.typicode.com/users')
        .then(response => response.json())
        .then(json => this.setState({robots : json }))
    }

    onSearchChange = (event) => {
        this.setState({searchfield : event.target.value }) ;
    }

    render () {
        const filteredRobots = this.state.robots.filter( robot => {
            return(robot.name.toLowerCase().includes(this.state.searchfield.toLowerCase())  )
        }) ;
        if (!this.state.robots.length) {
            return (<h1>loading ...</h1>)
        } else {
            return (
                <div className="tc">
                <h1 className="f1">ROBOFRIENDS</h1>
                <SearchBox searchChange={this.onSearchChange} />
                <Scroll> 
                    <ErrorBoundry>
                        <CardList robots={filteredRobots} /> 
                    </ErrorBoundry>
                </Scroll>
                </div> ) ;        
        }
        
    }
}

export default App ;
