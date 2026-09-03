import React from "react";
import Card from "./Card";

const CardList = ({robots, favorites, onToggleFavorite, onSelect}) => {
    // e2e verifier: guard team spawn against edge cases (null, non-array, missing id, non-array favorites)
    const validRobots = (Array.isArray(robots) ? robots : []).filter(r => r != null && r.id != null);
    const isFav = (id) => Array.isArray(favorites) && favorites.includes(id);
    const cardcomponent = validRobots.map( (robot) => <Card key={robot.id} 
                                                        id={robot.id} 
                                                        name={robot.name} 
                                                        email={robot.email} 
                                                        isFavorite={isFav(robot.id)}
                                                        onToggleFavorite={onToggleFavorite}
                                                        onSelect={onSelect ? () => onSelect(robot) : undefined}
                                                    />
    ) ;

    return (
        <div className="card-grid">
            {cardcomponent}
        </div>
    ) ;
}

export default CardList ;
