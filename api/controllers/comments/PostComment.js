const moment = require('moment');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');

module.exports = (req, res) => {
    const uid = req.uid;
    const story = parseInt(req.body.story);
    const message = req.body.message;
    const date = moment.utc().toDate().toUTCString();

    const response = new Response(res, uid, "PostComment.js");
    const errors = new Errors();

    let repliedTo;
    if(req.body.replied_to === undefined) {
        repliedTo = 0;
    } else {
        repliedTo = parseInt(req.body.replied_to);
    }

    if(isNaN(story)) {
        return response.error(errors.inputs.story_id, "");  
    } 

    if(message.length > 500) {
        return response.error(error.inputs.comment_message, "");
    }

    if(isNaN(repliedTo)) {
        return response.error(errors.inputs.comment_reply, "");  
    } 

    let checkUserText = "SELECT uid FROM writers WHERE uid=$1 ORDER BY uid LIMIT 1";
    db.query(checkUserText, [uid], (err, result) => {
        
        if(err) {
            return response.error(errors.db.query, err);
        }

        if(result.rowCount === 1) {
            checkStory();
        } else {
            response.error(errors.auth.user_not_exists, "");
        }

    }); 

    checkStory = () => {

        let checkStoryText = "SELECT author FROM stories WHERE id=$1 ORDER BY id LIMIT 1";
        db.query(checkStoryText, [story], (err, result) => {

            if(err) {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount == 1) {
                checkReplyValid(result.rows[0].author);
            } else {    
                response.error(errors.story.story_not_found, story);
            }
        })

    }

    checkReplyValid = (author) => {
        
        if(repliedTo <= 0) {
            postComment(author, "", "");
            return;
        }

        let checkReplyText = "SELECT id, writer FROM story_comments WHERE story=$1 AND id=$2 ORDER BY id, story LIMIT 1";
        db.query(checkReplyText, [story, repliedTo], (err, result) => {
            if(err) {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount === 1) {
                postComment(author, result.rows[0].writer, result.rows[0].id);
            } else {
                response.error(errors.story.comment_not_found, "");
            }
        });
    }



    postComment = (storyAuthor, commentWriter, comment) => {
        db.getClient((err, client, release) => {
            
            if(err) {
                return response.error(errors.db.connect, err);
            }
            (async () => {
                let success = false;
                try {
                    await client.query('BEGIN');

                    let insertText = "INSERT INTO story_comments (date, story, writer, message, upvotes,";
                    insertText += "downvotes, replies, replied_to) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *";
                    client.query(insertText, [date, story, uid, message, 0, 0, 0, repliedTo]);
                    
                    if(repliedTo !== 0) {
                        let updateComment = "UPDATE story_comments SET replies = replies + 1 WHERE ";
                        updateComment += "id=$1 AND story=$2";
                        await client.query(updateComment, [repliedTo, story]);
                    }   

                    let updateStory = "UPDATE stories SET comments = comments + 1 WHERE id=$1";
                    await client.query(updateStory, [story]);

                    // Event for story author.
                    let eventText = "INSERT INTO events(w_by, w_to, type, content, date) VALUES";
                    eventText += "($1, $2, $3, $4, $5)";
                    await client.query(eventText, [uid, storyAuthor, 'C', {story:story, seen:false}, date]);
                    //Event for comment writer to which this comment is a reply.
                    if(commentWriter !== "" && repliedTo !== 0 ) {
                        await client.query(eventText, [uid, storyAuthor, 'R', {comment:comment, seen:false}, date]);
                    }

                    await client.query('COMMIT');
                    success = true;  
                } catch(err) {
                    success = false;
                    await client.query("ROLLBACK");
                    console.log(err);
                } finally {
                    release();
                    if(success) {
                        getComment();
                    } else {
                        response.error(errors.db.transaction, "");
                    }
                }
            })().catch(e => {
                response.error(errors.db.transaction, e);
            });
        });
    }

    getComment = () => {
        
        let commentText = "SELECT c.*, w.username, w.uid, w.name, w.dp FROM story_comments c, writers w WHERE c.story=$1 AND c.writer=$2 AND ";
        commentText += "c.message=$3 AND c.replied_to=$4 AND c.date=$5 AND c.writer=w.uid ORDER BY c.date DESC LIMIT 1";
        db.query(commentText, [story, uid, message, repliedTo, date], (err, result) => 
        {
            if(err) {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount === 1) {
                response.ok(result.rows[0]);
            } else {
                response.error(errors.story.comment_not_found, "");
            }
        });
    }
}