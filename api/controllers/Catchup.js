const db = require('../db/DB');
const Response = require('../utils/response/Response');
const Errors = require('../utils/response/Errors');
const tokenizer = require('../utils/Tokenizer');
const mathf = require('../utils/Mathf');

module.exports = (req, res) => {

	const token = req.cookies['gettone'];
	let uid = undefined;

	const response = new Response(res, "", "Catchup.js");
	const errors = new Errors();

	if(token !== undefined) 
	{	
		uid = tokenizer.verify(token);	
		if(uid !== undefined) 
		{
			response.setUid(uid);
		} 
		else 
		{
			return response.error(errors.auth.invalid_token, token + " " + uid);
		}
	} 
	else 
	{ 
		return response.error(errors.auth.invalid_token, token);
 	}

	const userText = "SELECT uid, name, username, dp, reputations, elite FROM writers WHERE uid=$1 ORDER BY uid LIMIT 1";
	db.query(userText, [uid], (err, result) => 
	{
		if(err) 
		{
	        return response.error(errors.db.query, err);
	    }

	    if(result.rowCount == 1)
	    {
	    	result.rows[0].dp = mathf.signUrl(result.rows[0].dp);
	    	getEvents(result.rows[0]);
	    }
	    else
	    {
	        response.error(errors.auth.user_not_exists, uid);
	    }
	});
 	
	getEvents = (writer) => 
	{
		const eventCountText = "SELECT COUNT(id) AS evt FROM events WHERE w_to=$1 AND content->>'seen'=$2";
		db.query(eventCountText, [uid, false], (err, result) => 
		{
			if(err)
			{
				return response.error(errors.db.query, err);
			}

			writer.events = result.rows[0].evt;
	        response.ok(writer);
		});
	}
}