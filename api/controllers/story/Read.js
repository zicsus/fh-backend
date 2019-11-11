const moment = require('moment');
const db = require("../../db/DB");
const Response = require("../../utils/response/Response");
const Errors = require("../../utils/response/Errors");
const constants = require('../../utils/Constants.json');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => {

    const uid = req.uid;
    const story = req.params.story;

    const response = new Response(res, (uid != undefined) ? uid : "", "Read.js");
    const errors = new Errors();

    const storyArr = story.split("-");
    if(storyArr.length < 2) {
        return response.error(errors.inputs.story, storyArr);
    }
    const storyId = parseInt(storyArr[storyArr.length - 2]);
    const page = parseInt(storyArr[storyArr.length - 1]);
    delete storyArr;

    if(isNaN(storyId)) {
        return response.error(errors.inputs.story_id, story);
    }

    if(isNaN(page)) {
        return response.error(errors.inputs.page, [story, page]);
    }

    let storyText = "SELECT fibs, title, description, genre FROM stories WHERE id=$1 ORDER BY id LIMIT 1";
    db.query(storyText, [storyId], (err, result) => 
    {
        if(err) 
        {
            return response.error(errors.db.query, err);
        }

        if(result.rowCount == 1) 
        {
            const fibs = result.rows[0].fibs;
            const pages = Math.ceil(fibs / constants.PAGE_SIZE);
            result.rows[0].pages = (pages == 0) ? 1 : pages;

            if(page <= pages && pages != 0) 
            {
                getFibs(result.rows[0]);
            } 
            else if(pages == 0 && page == 1) 
            {
                response.ok({story: result.rows[0], fibs: []});
            } 
            else 
            {    
                response.error(errors.inputs.page_not_found, [page, storyId]);
            }
        } 
        else 
        {    
            return response.error(errors.story.story_not_found, storyId);
        }

    });

    getFibs = (story) => 
    {    
        const offset = (page - 1) * constants.PAGE_SIZE;
        
        let voteText = "";
        let params = [storyId, offset];
        if(uid !== undefined) 
        {
            voteText = ", (SELECT v.vote FROM fib_votes v WHERE v.fib=f.id ";
            voteText += "AND writer=$3 LIMIT 1)";
            params.push(uid);
        }
        
        let fibsText = "SELECT f.*, w.username, w.name, w.dp"+voteText+" FROM fibs f, writers w ";
        fibsText += "WHERE f.story=$1 AND w.uid = f.writer ORDER BY id OFFSET $2 LIMIT " + constants.PAGE_SIZE;
        db.query(fibsText, params, (err, result) => 
        {
            if(err) 
            {
                return response.error(errors.db.query, err);
            }

            for(let i in result.rows) 
            {
                let fib = result.rows[i];
                if(uid !== undefined) 
                {
                    if(fib.vote === null) 
                    {
                        fib.vote = 0;
                    }
                    else if(fib.vote) 
                    {
                        fib.vote = 1;
                    } 
                    else 
                    {
                        fib.vote = -1;
                    }
                }
                fib.dp = mathf.signUrl(fib.dp);
            }

            if(uid !== undefined) 
            {
                record(story, result.rows);
            }
            else
            {
                response.ok({story: story, fibs: result.rows});
            }
        });
    }

    record = (story, fibs) => 
    {
        if(fibs.length === 0) 
        {
            return response.ok({story: story, fibs: fibs});
        }

        const updateRecordText = "UPDATE history SET page=$1 WHERE uid=$2 AND story=$3 RETURNING id";
        db.query(updateRecordText, [page, uid, storyId], (err, result) => 
        {
            if(err)
            {        
                return response.error(errors.db.query, err);
            }

            if(result.rowCount === 0) 
            {
                const date = moment.utc().toDate().toUTCString();
                const insertRecordText = "INSERT INTO history(date, uid, story, page) VALUES($1, $2, $3, $4)";
                db.query(insertRecordText, [date, uid, storyId, page], (err, result) => 
                {
                    if(err)
                    {        
                        return response.error(errors.db.query, err);
                    }

                    response.ok({story: story, fibs: fibs});
                });
            }
            else
            {
                response.ok({story: story, fibs: fibs});
            }
        });
    }

}