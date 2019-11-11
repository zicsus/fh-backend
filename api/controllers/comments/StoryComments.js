const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const story = parseInt(req.params.story);

    let repliedTo;
    if(req.params.replied_to === undefined) 
    {
        repliedTo = 0;
    } 
    else 
    {
        repliedTo = req.params.replied_to;
    }

    const response = new Response(res, uid, "Comments.js");
    const errors = new Errors();

    if(story === NaN) 
    {
        return response.error(errors.inputs.story_id, "");  
    } 

    if(repliedTo === NaN) 
    {
        return response.error(errors.inputs.comment_reply, "");  
    } 
    
    const commentParams = [story, repliedTo];
    let commentText = "SELECT c.*, w.uid, w.name, w.username, w.dp ";
    
    if(uid != undefined) 
    {
       commentText += ", (SELECT v.vote FROM comment_votes v WHERE type='s' ";
       commentText += "AND v.comment=c.id AND writer=$3 LIMIT 1) ";
       commentParams.push(uid);
    }

    commentText += "FROM story_comments c, writers w WHERE c.story=$1 AND ";
    commentText += "c.writer=w.uid AND c.replied_to=$2 ORDER BY c.date DESC LIMIT 15";

    db.query(commentText, commentParams, (err, result) => {
        
        if(err) {
            return response.error(errors.db.query, err);
        }
        
        
        for(let i in result.rows) 
        {
            if(uid !== undefined) 
            {
                let comment = result.rows[i];
                if(comment.vote === null) 
                {
                    comment.vote = 0;
                }
                else if(comment.vote) 
                {
                    comment.vote = 1;
                } 
                else 
                {
                    comment.vote = -1;
                }
            }
            result.rows[i].dp = mathf.signUrl(result.rows[i].dp);
        }

        
        response.ok(result.rows);
    });

}