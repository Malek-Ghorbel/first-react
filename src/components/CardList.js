import React from "react";
import Card from "./Card";

const CardList = ({robots}) => {
   // throw new Error('noooo') ;

    const cardcomponent = robots.map( (user,i) => <Card key={robots[i].id} 
                                                        id={robots[i].id} 
                                                        name={robots[i].name} 
                                                        email={robots[i].email} 
                                                    />
    ) ;

    return (
        <div>
            {cardcomponent}
        </div>
    ) ;
}

export default CardList ;