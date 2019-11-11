const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const storyUrl = req.params.story;

    const response = new Response(res, uid, "GetStoryForEdit.js");
    const errors = new Errors();

    const storyArr = storyUrl.split("-");
    const storyId = storyArr[storyArr.length - 1];
    delete storyArr;

    if(isNaN(storyId))
    {
        return response.error(errors.inputs.story_id, storyUrl);
    }
    
    let storyText = "SELECT s.id, s.cover, s.title, s.description, s.tags, g.name as genre ";
    storyText += "FROM stories s, genres g WHERE s.id=$1 AND s.author=$2 AND ";
    storyText += "g.id=s.genre ORDER BY s.id LIMIT 1";

    db.query(storyText, [storyId, uid], (err, result) => 
    {
        if(err) {
            return response.error(errors.db.query, err);
        }

        if(result.rowCount == 1)
        {
            if(result.rows[0].tags.trim() !== "")
            {
                result.rows[0].tags = result.rows[0].tags.split(', ');
            }
            else
            {
                result.rows[0].tags = [];
            }
            result.rows[0].cover = mathf.signUrl(result.rows[0].cover);
            response.ok(result.rows[0], false);
        }
        else
        {
            response.error(errors.story.story_not_found, storyUrl);
        }
    });
}
