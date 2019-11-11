const moment = require('moment');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');

module.exports = (req, res) => 
{ 
    const date = moment.utc().toDate().toUTCString();
    const uid = req.uid;
    const story = req.params.story;
    let rawFib = req.body.fib;
    const prevFib = parseInt(req.body.prev_fib);

    const response = new Response(res, uid, "NewFib.js");
    const errors = new Errors();

    const storyArr = story.split("-");
    const storyId = parseInt(storyArr[storyArr.length - 1]);
    delete storyArr;

    if(isNaN(storyId)) 
    {
        return response.error(errors.inputs.story_id, story);
    }

    if(isNaN(prevFib)) 
    {
        return response.error(errors.inputs.prev_fib, prevFib);
    }

    const val = rawFib.replace(/(&nbsp;|<([^>]+)>)/ig, "");
    const matches = val.match(/[\w\d\’\'-]+/gi);
    let words = matches ? matches.length : 0;
    if(words < 60 && words > 1000) 
    {
        return response.error(errors.input.fib, rawFib.length);
    }

    // Sanitize br and div
    const fib = rawFib.replace(/(<([^>]br)>)/ig, "")
                    .replace(/(<(br[^>]*)>)/ig, "")
                    .replace(/(<([^>]div)>)/ig, "")
                    .replace(/(<(div[^>]*)>)/ig, "");

    const checkStoryText = "SELECT author from stories WHERE id=$1 LIMIT 1";
    db.query(checkStoryText, [storyId], (err, result) => 
    {
        if(err) 
        {
            return response.error(errors.db.query, err);
        }

        if(result.rowCount == 1) 
        {
            checkPrevFib(result.rows[0].author);
        } 
        else 
        {    
            response.error(errors.story.story_not_found);
        }

    });

    checkPrevFib = (author) => 
    {
        const checkPrevFibText = "SELECT * FROM fibs WHERE story=$1 ORDER BY id DESC LIMIT 1";
        db.query(checkPrevFibText, [storyId], (err, result) => {

            if(err) 
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount == 1) 
            {
                if(result.rows[0].id == prevFib) 
                {
                    checkContribution(author);
                } 
                else 
                {
                    response.error(errors.story.not_last_fib, [storyId, uid, prevFib]);
                }
            } 
            else 
            {
                checkContribution(author);
            }
        });
    }

    checkContribution = (author) => 
    {
        const checkText = "SELECT id FROM fibs WHERE story=$1 AND writer=$2 ORDER BY story LIMIT 1";
        db.query(checkText, [storyId, uid], (err, result) => 
        {
            if(err)
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount == 1)
            {
                insertFib(author, false);
            }
            else
            {
                insertFib(author, true);
            }
        })
    }

    insertFib = (author, newContribution) => 
    {
        db.getClient((err, client, release) => 
        {
            if(err) 
            {
                return response.error(errors.db.connect, err);
            }

            (async () => 
            {
                let success = false;
                try 
                {
                    await client.query("BEGIN");

                    let insertText = "INSERT INTO fibs (date, story, writer, fib, comments, upvotes, downvotes) ";
                    insertText += "VALUES($1, $2, $3, $4, $5, $6, $7)"
                    await client.query(insertText, [date, storyId, uid, fib, 0, 0, 0]);

                    let updateStoryText = "UPDATE stories SET fibs = fibs + 1 ";
                    if(newContribution)
                    {
                        updateStoryText += ", contributors = contributors + 1 ";
                    }
                    updateStoryText += "WHERE id=$1";
                    await client.query(updateStoryText, [storyId]);

                    const updateWriterText = "UPDATE writers SET fibs = fibs + 1 WHERE uid=$1";
                    await client.query(updateWriterText, [uid]);

                    if(author != uid)
                    {
                        let eventText = "INSERT INTO events(w_by, w_to, type, content, date) VALUES";
                        eventText += "($1, $2, $3, $4, $5)";
                        await client.query(eventText, [uid, author, 'F', {story:storyId, seen:false}, date]);
                    }

                    success = true;
                    await client.query("COMMIT");
                } 
                catch(err) 
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
                        getFib();
                    } 
                    else 
                    {
                        response.error(errors.db.transaction, "");
                    }
                }
            })();
        });
    }

    getFib = () => 
    {
        let fibText = "SELECT f.*, w.username, w.dp, w.name FROM fibs f, writers w WHERE ";
        fibText += "f.date=$1 AND f.story=$2 AND f.fib=$3 AND f.writer=$4 AND w.uid=f.writer ";
        fibText += "ORDER BY f.id DESC LIMIT 1";
        db.query(fibText, [date, storyId, fib, uid], (err, result) => 
        {
            if(err) 
            {
                return response.error(errros.db.query, err);
            }

            if(result.rowCount == 1) 
            {
                response.ok(result.rows[0]);
            } 
            else 
            {
                response.error(errors.story.fib_not_found, [date, storyId, fib, uid]);
            }
        });
    }

} 