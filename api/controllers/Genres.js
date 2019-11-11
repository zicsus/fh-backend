const moment = require('moment');
const db = require('../db/DB');
const Response = require('../utils/response/Response');
const Errors = require('../utils/response/Errors');

module.exports = (req, res) =>
{
    const uid = req.uid;
    const response = new Response(res, uid, "Register.js");
    const errors = Errors();
    const date = moment.utc().toDate().toUTCString();
    

    const genreText = "SELECT name, stories from genres ORDER BY name";
    db.query(genreText, [], (err, result) => 
    {
        if(err)
        {
            return response.error(errors.db.query, err);
        }

        response.ok(result.rows);
    });


    /*
    const genres = [
        "Action", 
        "Adventure", 
        "Anime", 
        "Fanfiction",
        "Fantasy",
        "Fiction",
        "Horror",
        "Humor",
        "Mystery",
        "Non-Fiction",
        "Poetry",
        "Romance",
        "Short Story",
        "Spiritual",
        "Thriller"
    ];

    const insertGenres = "INSERT INTO genres(date, name, stories) VALUES($1, $2, $3)";
    for(i in genres)
    {
        db.query(insertGenres, [date, genres[i], 0], (err, result) => 
        {
            if(err)
            {
                console.log(err);
            }
        })
    }

    */
}