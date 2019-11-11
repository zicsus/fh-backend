const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');
const constants = require('../../utils/Constants.json');

module.exports = (req, res) => 
{
	const uid = req.uid;
	const offset = parseInt(req.params.offset);

	const response = new Response(res, uid, 'ContinueReading.js');
	const errors = new Errors();

	if(isNaN(offset)) 
	{
		return response.error(errors.inputs.offset, [req.params.offset, uid]);
	}

	let historyText = "SELECT s.id, s.cover, s.title, w.username, w.dp, h.page FROM stories AS s, writers ";
    historyText += "AS w, history AS h WHERE h.uid=$1 AND s.id=h.story AND s.published=true ";
    historyText += "AND w.uid=s.author ORDER BY h.date DESC OFFSET $2 LIMIT 15";

    db.query(historyText, [uid, offset], (err, result) => 
    {
    	if(err)
    	{
    		return response.error(errors.db.query, err);
    	}

    	const stories = result.rows.map((item) => 
		{
			item.cover = mathf.signUrl(item.cover);
            item.dp = mathf.signUrl(item.dp);
            item.url = item.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + item.id + '-' + item.page;
          	delete item.page;

            if(item.title.length > 20) 
            {
                item.title = item.title.substring(0, 20) + "...";
            }
            return item;
		}); 

		response.ok(stories);
    });
}