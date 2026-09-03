import React from "react";
import Card from "./Card";

const CardList = ({robots, favorites, onToggleFavorite, onSelect}) => {
    const validRobots = (robots || []).filter(r => r && typeof r.id !== 'undefined');
    const cardcomponent = validRobots.map( (robot) => <Card key={robot.id} 
                                                        id={robot.id} 
                                                        name={robot.name} 
                                                        email={robot.email} 
                                                        isFavorite={favorites ? favorites.includes(robot.id) : false}
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
