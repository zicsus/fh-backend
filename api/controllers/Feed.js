const db = require('../db/DB');
const Response = require('../utils/response/Response');
const Errors = require('../utils/response/Errors');
const mathf = require('../utils/Mathf');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const offset = parseInt(req.params.offset);
    const response = new Response(res, uid, "Feed.js");
    const errors = new Errors();

    let feedText = "SELECT s.id, s.title, s.description, s.cover, s.comments, s.upvotes, ";
    feedText += "s.downvotes, s.fibs, s.tags, w.uid, w.username, w.dp FROM stories AS s, writers ";
    feedText += "AS w, relations AS r WHERE s.published=true AND r.follower=$1 AND ";
    feedText += "s.author=r.following AND w.uid=r.following ORDER BY s.date DESC OFFSET $2 LIMIT 15";

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
            item.description = item.description.substring(0, 100) + "...";
            item.tags = item.tags.split(', ');
            return item;
        });

        getHistory(stories);
    });

    const getHistory = (stories) => 
    {
        if(uid == undefined)
        {
            return response.ok(stories);
        }    

        const ids = stories.map((item) => 
        {
            return item.id;
        });

        let historyText = "SELECT story, page FROM history WHERE uid=$1 AND story=ANY($2::bigint[]) ORDER BY uid LIMIT 15";
        db.query(historyText, [uid, ids], (err, result) => 
        {
            if(err)
            {
                return response.error(errors.db.query, err);
            }

            result.rows.map((item) => 
            {
                for(let i in stories)
                {
                    let story = stories[i];
                    if(item.story == story.id)
                    {
                        story.url = story.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + story.id + '-' + item.page;
                        story.continueReading = true;
                    }
                }
            });

            response.ok(stories);
        });
    }
}