import React from "react";
import Card from "./Card";

const CardList = ({robots, favorites, onToggleFavorite, onSelect}) => {
    const cardcomponent = robots.map( (user,i) => <Card key={robots[i].id} 
                                                        id={robots[i].id} 
                                                        name={robots[i].name} 
                                                        email={robots[i].email} 
                                                        isFavorite={favorites ? favorites.includes(robots[i].id) : false}
                                                        onToggleFavorite={onToggleFavorite}
                                                        onSelect={onSelect ? () => onSelect(robots[i]) : undefined}
                                                    />
    ) ;

    return (
        <div className="card-grid">
            {cardcomponent}
        </div>
    ) ;
}

export default CardList ;
