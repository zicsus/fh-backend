const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const type = req.params.type;
    const search = req.params.search;
    const offset = parseInt(req.params.offset);

    const response = new Response(res, uid, "Search.js");
    const errors = new Errors();

    if(type !== "stories" && type !== "writers" && type !== "tags") {
        return response.error(errors.inputs.type, type);
    }    

    if(isNaN(offset)) {
        return response.error(errors.input.offset, offset);
    }    

    const searchStories = () => {
        let searchText = "SELECT s.id, s.title, s.description, s.cover, s.comments, s.upvotes, ";
        searchText += "s.downvotes, s.fibs, s.tags, w.uid, w.username, w.dp FROM stories AS s, writers ";
        searchText += "AS w WHERE (s.title ILIKE '%' || $1 || '%' OR s.tags ILIKE '%' || $1 || '%') AND s.published=true ";
        searchText += "AND s.author=w.uid OFFSET $2 LIMIT 20";

        db.query(searchText, [search, offset], (err, result) => {

            if(err) {
                return response.error(errors.db.query, err);
            }

            const stories = result.rows.map((item) => {
                item.dp = mathf.signUrl(item.dp);
                item.cover = mathf.signUrl(item.cover);
                item.url = item.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + item.id;
                item.description = item.description.substring(0, 100) + "...";
                item.tags = item.tags.split(', ');
                return item;
            });

            getHistory(stories);
        });
    }

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

        let historyText = "SELECT story, page FROM history WHERE uid=$1 AND story=ANY($2::bigint[]) ORDER BY uid LIMIT 20";
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

    const searchWriters = () => {

        let searchText = "SELECT name, username, dp FROM writers WHERE username ILIKE '%' || $1 || '%' OR ";
        searchText += "name ILIKE '%' || $1 || '%' OFFSET $2 LIMIT 20";

        db.query(searchText, [search, offset], (err, result) => {
            if(err) {
                return response.error(errors.db.query, err);
            }
            const writers = result.rows.map((item) => {
                item.dp = mathf.signUrl(item.dp);
                return item;
            });
            response.ok(writers);
        });
    }

    const searchTopics = () => {

        let searchText = "SELECT name, stories FROM tags WHERE name ILIKE '%' || $1 || ";
        searchText += "'%' OFFSET $2 LIMIT 20";

        db.query(searchText, [search, offset], (err, result) => {

            if(err) {
                return response.error(error.db.query, err);
            }

            response.ok(result.rows);
        });

    }


    switch(type) {
        case "stories":
            searchStories();
            break;
        case "writers": 
            searchWriters();
            break;
        case "tags": 
            searchTopics();
            break;
    }
}

