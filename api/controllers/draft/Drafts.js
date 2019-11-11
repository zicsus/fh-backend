const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
	const uid = req.uid;
	const offset = parseInt(req.params.offset);

	const response = new Response(res, uid, 'Drafts.js');
	const errors = new Errors();

	if(isNaN(offset))
	{
		return response.error(errors.inputs.offset, [req.params.offset, uid]);
	}

	const draftText = "SELECT * FROM drafts WHERE author=$1 ORDER BY date OFFSET $2 LIMIT 20";
	db.query(draftText, [uid, offset], (err, result) => 
	{
		if(err)
		{
			return response.error(errors.db.query, err);
		}

		const drafts = result.rows.map(item => 
		{	
			item.cover = mathf.signUrl(item.cover);
			item.url = mathf.generateStoryUrl(item.title, item.id);
			return item;
		});

		response.ok(drafts);
	});
}