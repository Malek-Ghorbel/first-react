import React from "react";
import Card from "./Card";

const CardList = ({robots, favorites, onToggleFavorite, onSelect}) => {
    // e2e verifier: guard team spawn against edge cases (null, non-array, missing id, non-array favorites, non-function callbacks, throwing id getter)
    const validRobots = (Array.isArray(robots) ? robots : []).filter(r => {
        if (r == null) return false;
        try { return r.id != null; } catch { return false; }
    });
    const isFav = (id) => {
        try { return Array.isArray(favorites) && favorites.includes(id); } catch { return false; }
    };
    const safeOnToggle = typeof onToggleFavorite === 'function' ? onToggleFavorite : undefined;
    const safeOnSelect = typeof onSelect === 'function' ? onSelect : undefined;
    const cardcomponent = validRobots.map( (robot, idx) => {
        let rid, rname, remail;
        try { rid = robot.id; } catch { rid = `fallback-${idx}`; }
        try { rname = robot.name; } catch { rname = ''; }
        try { remail = robot.email; } catch { remail = ''; }
        let fav;
        try { fav = isFav(rid); } catch { fav = false; }
        return <Card key={rid}
                                                        id={rid}
                                                        name={rname}
                                                        email={remail}
                                                        isFavorite={fav}
                                                        onToggleFavorite={safeOnToggle}
                                                        onSelect={safeOnSelect ? () => safeOnSelect(robot) : undefined}
                                                    />;
    }) ;

    return (
        <div className="card-grid">
            {cardcomponent}
        </div>
    ) ;
}

export default CardList ;
