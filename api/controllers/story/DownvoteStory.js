const moment = require('moment');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const story = req.body.story;
    const status = req.body.status;
    const date = moment.utc().toDate().toUTCString();

    const response = new Response(res, uid, "DownvoteStory.js");
    const errors = new Errors();

    const storyArr = story.split("-");
    const storyId = parseInt(storyArr[storyArr.length - 1]);
    delete storyArr;

    if(storyId === NaN) 
    {
        return response.error(errors.inputs.story, story);
    }
    
    const statusEnums = {
        UP_VOTED: 0,
        DOWN_VOTED: 1,
        NEW_VOTE: 2
    };

    const checkStoryText = "SELECT id, author FROM stories WHERE id=$1 ORDER BY id LIMIT 1";
    db.query(checkStoryText, [storyId], (err, result) => 
    {
        if(err) 
        {
            return response.error(errors.db.query, err);
        }

        if(result.rowCount === 1) 
        {
            if(result.rows[0].author == uid)
            {
                return response.error(errors.inputs.selfVote, uid);
            }

            checkVote(result.rows[0].author);
        } 
        else 
        {
            return response.error(errors.story.story_not_found, storyId);
        }
    });

    checkVote = (writer) => 
    {
        const checkVoteText = "SELECT id, vote FROM story_votes WHERE writer=$1 AND story=$2 LIMIT 1";
        db.query(checkVoteText, [uid, storyId], (err, result) => 
        {
            if(err) 
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount == 1) 
            {
                if(result.rows[0].vote == true) 
                {
                    if(status) 
                    {
                        downvote(writer, statusEnums.UP_VOTED);
                    } 
                    else 
                    {
                        response.ok("");
                    }
                } 
                else 
                {
                    if(status) 
                    {
                        response.ok("");
                    } 
                    else 
                    {
                        downvote(writer, statusEnums.DOWN_VOTED);
                    }
                }
            } 
            else 
            {
                if(status) 
                {
                    downvote(writer, statusEnums.NEW_VOTE);
                } 
                else 
                {
                    response.ok("");
                }
            }
        });
    }

    downvote = (writer, voteStatus) => 
    {
        db.getClient((err, client, release) => 
        {
            if(err) 
            {
                return response.error(errors.db.connect, err);
            }

            (async () => 
            {
                let success = true;
                try 
                {
                    await client.query('BEGIN');

                    let voteText = "INSERT INTO story_votes(date, story, writer, vote) ";
                    voteText += "VALUES ($1, $2, $3, $4)";
                    let voteParams = [date, storyId, uid, false];
                    let storyUpdateText = "UPDATE stories SET downvotes = downvotes + 1 WHERE id=$1"
                    let writerUpdateText = "UPDATE writers SET reputations = reputations - 2 WHERE uid=$1";
                    let eventText = "";

                    if(voteStatus == statusEnums.UP_VOTED) 
                    {
                        voteText = "UPDATE story_votes SET date=$1, vote=$2 WHERE writer=$3 AND story=$4";
                        voteParams = [date, false, uid, storyId];
                        storyUpdateText = "UPDATE stories SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id=$1"
                        writerUpdateText = "UPDATE writers SET reputations = reputations - 7 WHERE uid=$1";
                        eventText = "DELETE FROM events WHERE w_by=$1 AND type='S' AND content->>'story'=$2"; 
                    } 
                    else if(voteStatus == statusEnums.DOWN_VOTED) 
                    {
                        voteText = "DELETE FROM story_votes WHERE writer=$1 AND story=$2";
                        voteParams = [uid, storyId];
                        storyUpdateText = "UPDATE stories SET downvotes = downvotes - 1 WHERE id=$1"
                        writerUpdateText = "UPDATE writers SET reputations = reputations + 2 WHERE uid=$1";
                    }

                    await client.query(voteText, voteParams);
                    await client.query(storyUpdateText, [storyId]);
                    await client.query(writerUpdateText, [writer]);
                    if(eventText != "")
                        await client.query(eventText, [uid, storyId]);
                    
                    await client.query('COMMIT');
                }
                catch(error) 
                {
                    success = false;
                    await client.query("ROLLBACK");
                    console.log(err);
                } 
                finally 
                {
                    release();
                    if(success) 
                    {
                        response.ok("");
                    } 
                    else 
                    {
                        response.error(errors.db.transaction, "");
                    }
                }
            })();
        });
    }
}