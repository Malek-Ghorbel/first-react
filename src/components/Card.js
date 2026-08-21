import React from 'react' ;

const Card = ({id, name, email}) => {
    return (
        <div className="bg-light-green dib br3 ma2 grow shadow-5">
            <img alt={`Robot avatar for ${name}`} src={`https://robohash.org/${id}?50x50`} />
            <div>
                <h2> {name} </h2> 
                <p> {email} </p>
            </div>
        </div>
    )
}

export default Card ;
