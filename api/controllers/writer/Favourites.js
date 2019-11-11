const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const offset = parseInt(req.params.offset);

    const response = new Response(res, uid, "Favourites.js");	
    const errors = new Errors();

    if(isNaN(offset)) {
    	return response.error(errors.inputs.offset, [req.params.offset, uid]);
    }

    let feedText = "SELECT s.id, s.cover, s.title, w.username, w.dp FROM stories AS s, writers ";
    feedText += "AS w, favourites AS f WHERE f.uid=$1 AND s.id=f.story AND s.published=true ";
    feedText += "AND w.uid=s.author ORDER BY f.date DESC OFFSET $2 LIMIT 15";

    db.query(feedText, [uid, offset], (err, result) => 
    {
        if(err)
        {
            return response.error(errors.db.query, err);
        }

        const stories = result.rows.map((item) => 
        {
            item.dp = mathf.signUrl(item.dp);
            item.cover = mathf.signUrl(item.cover);
            item.url = item.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + item.id;
            if(item.title.length > 20) 
            {
                item.title = item.title.substring(0, 20) + "...";
            }
            return item;
        });

        response.ok(stories);
    });
}