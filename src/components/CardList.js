import React from "react";
import Card from "./Card";

const CardList = ({robots, onSelect}) => {
    const cardcomponent = robots.map((user, i) => (
        <Card
            key={robots[i].id}
            id={robots[i].id}
            name={robots[i].name}
            email={robots[i].email}
            onSelect={() => onSelect(robots[i])}
        />
    ));

    return (
        <div>
            {cardcomponent}
        </div>
    );
}

export default CardList;
