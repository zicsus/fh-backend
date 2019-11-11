const moment = require('moment');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const story = req.body.story;
    const fib = parseInt(req.body.fib);
    const status = req.body.status;
    const date = moment.utc().toDate().toUTCString();

    const response = new Response(res, uid, "UpvoteFib.js");
    const errors = new Errors();

    const storyArr = story.split("-");
    const storyId = parseInt(storyArr[storyArr.length - 1]);
    delete storyArr;

    if(isNaN(storyId)) 
    {
        return response.error(errors.inputs.story, story);
    }

    if(isNaN(fib)) 
    {
        return response.error(errors.inputs.fibId, fib);
    }
    
    const statusEnums = {
        UP_VOTED: 0,
        DOWN_VOTED: 1,
        NEW_VOTE: 2
    };

    const checkFibText = "SELECT id, writer FROM fibs WHERE id=$1 AND story=$2 ORDER BY id LIMIT 1";
    db.query(checkFibText, [fib, storyId], (err, result) => 
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
            return response.error(errors.story.fib_not_found, [fib, storyId]);
        }
    });

    checkVote = (writer) => 
    {
        const checkVoteText = "SELECT id, vote FROM fib_votes WHERE writer=$1 AND fib=$2 LIMIT 1";
        db.query(checkVoteText, [uid, fib], (err, result) => 
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
                        response.ok("");
                    } 
                    else 
                    {
                        upvote(writer, statusEnums.UP_VOTED);
                    }
                } 
                else 
                {
                    if(status) 
                    {
                        upvote(writer, statusEnums.DOWN_VOTED);
                    } 
                    else 
                    {
                        response.ok("");
                    }
                }
            } 
            else 
            {
                if(status) 
                {
                    upvote(writer, statusEnums.NEW_VOTE);
                } 
                else 
                {
                    response.ok("");
                }
            }
        });
    }

    upvote = (writer, voteStatus) => 
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

                    let voteText = "INSERT INTO fib_votes(date, fib, writer, vote) ";
                    voteText += "VALUES ($1, $2, $3, $4)";
                    let voteParams = [date, fib, uid, true];
                    let fibUpdateText = "UPDATE fibs SET upvotes = upvotes + 1 WHERE id=$1"
                    let writerUpdateText = "UPDATE writers SET reputations = reputations + 10 WHERE uid=$1";
                    let eventText = "INSERT INTO events(w_by, w_to, type, content, date) VALUES";
                    eventText += "($1, $2, $3, $4, $5)";
                    let eventParams = [uid, writer, 'G', {fib:fib, seen:false}, date];

                    if(voteStatus == statusEnums.DOWN_VOTED) 
                    {

                        voteText = "UPDATE fib_votes SET date=$1, vote=$2 WHERE writer=$3 AND fib=$4";
                        voteParams = [date, true, uid, fib];
                        fibUpdateText = "UPDATE fibs SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id=$1"
                        writerUpdateText = "UPDATE writers SET reputations = reputations + 12 WHERE uid=$1";
                    
                    } 
                    else if(voteStatus == statusEnums.UP_VOTED) 
                    {

                        voteText = "DELETE FROM fib_votes WHERE writer=$1 AND fib=$2";
                        voteParams = [uid, fib];
                        fibUpdateText = "UPDATE fibs SET upvotes = upvotes - 1 WHERE id=$1"
                        writerUpdateText = "UPDATE writers SET reputations = reputations - 10 WHERE uid=$1";
                        eventText = "DELETE FROM events WHERE w_by=$1 AND type='G' AND content->>'fib'=$2";
                        eventParams = [uid, fib]; 
                    }

                    await client.query(voteText, voteParams);
                    await client.query(fibUpdateText, [fib]);
                    await client.query(writerUpdateText, [writer]);
                    await client.query(eventText, eventParams);

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