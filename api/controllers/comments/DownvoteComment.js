const moment = require('moment');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const commentId = parseInt(req.body.comment);
    const status = req.body.status;
    const type = (req.params.type == "story") ? "s" : "f";
    const date = moment.utc().toDate().toUTCString();

    const response = new Response(res, uid, "DownvoteComment.js");
    const errors = new Errors();

    if(isNaN(commentId)) 
    {
        return response.error(errors.inputs.comment_id, commentId);
    }

    if(type !== "s" && type !== "f") 
    {
        return response.error(errors.inputs.type, type);
    }

    const table = (type === "s") ? "story_comments" : "fib_comments";
    const statusEnums = {
        UP_VOTED: 0,
        DOWN_VOTED: 1,
        NEW_VOTE: 2
    };

    const checkCommentText = "SELECT id, writer FROM "+table+" WHERE id=$1 ORDER BY id LIMIT 1";
    db.query(checkCommentText, [commentId], (err, result) => 
    {
        if(err) 
        {
            return response.error(errors.db.query, err);
        }

        if(result.rowCount === 1) 
        {
            if(result.rows[0].writer == uid)
            {
                return response.error(errors.inputs.selfVote, uid);
            }

            checkVote(result.rows[0].writer);
        } 
        else 
        {
            return response.error(errors.story.comment_not_found, "");
        }
    });

    checkVote = (writer) => 
    {
        const checkVoteText = "SELECT id, vote FROM comment_votes WHERE type=$1 AND writer=$2 AND comment=$3 LIMIT 1";
        db.query(checkVoteText, [type, uid, commentId], (err, result) => 
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

                    let voteText = "INSERT INTO comment_votes(date, comment, writer, vote, type) ";
                    voteText += "VALUES ($1, $2, $3, $4, $5)";
                    let voteParams = [date, commentId, uid, false, type];
                    let commentUpdateText = "UPDATE "+table+" SET downvotes = downvotes + 1 WHERE id=$1"
                    let writerUpdateText = "UPDATE writers SET reputations = reputations - 1 WHERE uid=$1";
                    let eventText = "";

                    if(voteStatus == statusEnums.UP_VOTED) 
                    {
                        voteText = "UPDATE comment_votes SET date=$1, vote=$2 WHERE type=$3 AND writer=$4 AND comment=$5";
                        voteParams = [date, false, type, uid, commentId];
                        commentUpdateText = "UPDATE "+table+" SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id=$1"
                        writerUpdateText = "UPDATE writers SET reputations = reputations - 2 WHERE uid=$1";
                        eventText = "DELETE FROM events WHERE w_by=$1 AND type='D' AND content->>'comment'=$2";
                    } 
                    else if(voteStatus == statusEnums.DOWN_VOTED) 
                    {
                        voteText = "DELETE FROM comment_votes WHERE type=$1 AND writer=$2 AND comment=$3";
                        voteParams = [type, uid, commentId];
                        commentUpdateText = "UPDATE "+table+" SET downvotes = downvotes - 1 WHERE id=$1"
                        writerUpdateText = "UPDATE writers SET reputations = reputations + 1 WHERE uid=$1";
                    }

                    await client.query(voteText, voteParams);
                    await client.query(commentUpdateText, [commentId]);
                    await client.query(writerUpdateText, [writer]);
                    if(eventText != "")
                        await client.query(eventText, [uid, commentId]);

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