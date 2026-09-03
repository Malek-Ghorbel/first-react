import React from "react";
import Card from "./Card";

const CardList = ({robots, favorites, onToggleFavorite, onSelect}) => {
    // e2e verifier: guard team spawn against edge cases (null, non-array, missing id, non-array favorites, non-function callbacks)
    const validRobots = (Array.isArray(robots) ? robots : []).filter(r => r != null && r.id != null);
    const isFav = (id) => Array.isArray(favorites) && favorites.includes(id);
    const safeOnToggle = typeof onToggleFavorite === 'function' ? onToggleFavorite : undefined;
    const safeOnSelect = typeof onSelect === 'function' ? onSelect : undefined;
    const cardcomponent = validRobots.map( (robot) => <Card key={robot.id} 
                                                        id={robot.id} 
                                                        name={robot.name} 
                                                        email={robot.email} 
                                                        isFavorite={isFav(robot.id)}
                                                        onToggleFavorite={safeOnToggle}
                                                        onSelect={safeOnSelect ? () => safeOnSelect(robot) : undefined}
                                                    />
    ) ;

    return (
        <div className="card-grid">
            {cardcomponent}
        </div>
    ) ;
}

export default CardList ;
