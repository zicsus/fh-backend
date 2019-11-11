const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
    const uid = req.uid;
    const draftUrl = req.params.draft;

    const response = new Response(res, uid, "Draft.js");
    const errors = new Errors();

    const draftArr = draftUrl.split("-");
    const draft = draftArr[draftArr.length - 1];
    delete draftArr;

    if(isNaN(draft))
    {
        return response.error(errors.inputs.draft, draftUrl);
    }

    let storyText = "SELECT d.id, d.cover, d.title, d.description, d.tags, d.private, g.name as genre ";
    storyText += "FROM drafts d, genres g WHERE d.id=$1 AND d.author=$2 AND ";
    storyText += "g.id=d.genre ORDER BY d.id LIMIT 1";
    db.query(storyText, [draft, uid], (err, result) => 
    {
        if(err) 
        {
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
            response.error(errors.story.draft_not_found, draftUrl);
        }
    });
}
