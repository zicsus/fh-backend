const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const storyUrl = req.params.story;

    const response = new Response(res, (uid != undefined) ? uid : "", "Story.js");
    const errors = new Errors();

    const storyArr = storyUrl.split("-");
    const storyId = parseInt(storyArr[storyArr.length - 1]);
    delete storyArr;

    if(isNaN(storyId))
    {
        return response.error(errors.inputs.story_id, storyUrl);
    }

    let storyText = "SELECT s.id, s.cover, s.title, s.description, s.upvotes, s.comments, s.downvotes, ";
    storyText += "s.contributors AS contributors_count, s.tags, s.fibs, g.name as genre, s.author, w.username, w.dp, ";
    storyText += "s.published, w.name from stories s, writers w, genres g ";
    storyText += "WHERE s.id=$1 AND s.author=w.uid AND g.id=s.genre ORDER BY s.id LIMIT 1";

    db.query(storyText, [storyId], (err, result) => 
    {
        if(err) {
            return response.error(errors.db.query, err);
        }

        if(result.rowCount == 1)
        {
            if(result.rows[0].published || (!result.rows[0].published && uid != undefined))
            {
                result.rows[0].cover = mathf.signUrl(result.rows[0].cover);
                result.rows[0].dp = mathf.signUrl(result.rows[0].dp);
                result.rows[0].tags = result.rows[0].tags.split(", ");
                getContributors(result.rows[0]);
            }
            else
            {
                response.error(errors.story.story_not_found, storyUrl);
            }
        }
        else
        {
            response.error(errors.story.story_not_found, storyUrl);
        }
    });

    getContributors = (story) => 
    {
        let contributorsText = "SELECT DISTINCT f.writer AS uid, w.username, w.dp, w.name FROM ";
        contributorsText += "fibs f, writers w WHERE f.story=$1 AND w.uid=f.writer LIMIT 20";

        db.query(contributorsText, [storyId], (err, result) => 
        {
            if(err) 
            {
                return response.error(errors.db.query, err);
            }    

            let isContributor = uid == story.author;
            result.rows.map(item => 
            {
                if(item.uid == uid)
                {
                    isContributor = true;
                }
                item.dp = mathf.signUrl(item.dp);
                return item;
            });

            if(!(story.published || (!story.published && isContributor)))
            {
                return response.error(errors.story.story_not_found, storyUrl);
            }

            story.contributors = result.rows;
            if(uid !== undefined) 
            {
                getVote(story);
            } 
            else 
            {
                response.ok(story, false);
            }
        });

    }

    getVote = (story) => {

        let voteText = "SELECT vote from story_votes WHERE story=$1 AND writer=$2 LIMIT 1";
        db.query(voteText, [storyId, uid], (err, result) => {

            if(err) {
                return response.error(errors.db.query, err);
            }
            
            if(result.rowCount === 1) {
                if(result.rows[0].vote) {
                    story.vote = 1;
                } else {
                    story.vote = -1;
                }
            } else {
                story.vote = 0;
            }

            getFavourite(story);

        });
    }

    getFavourite = (story) => {

        let favText = "SELECT id FROM favourites WHERE uid=$1 AND story=$2 ORDER BY uid LIMIT 1";
        db.query(favText, [uid, storyId], (err, result) => {

            if(err) {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount == 1) {
                story.favourite = true;
            }
            else {
                story.favourite = false;
            }

            getRecord(story);
        });

    }

    getRecord = (story) => 
    {

        let recordText = "SELECT page FROM history WHERE uid=$1 AND story=$2 ORDER BY uid LIMIT 1";
        db.query(recordText, [uid, storyId], (err, result) => 
        {
            if(err)
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount == 1)
            {
                story.continueReading = storyUrl + "-" + result.rows[0].page;
            }

            response.ok(story);
        })

    }
}
