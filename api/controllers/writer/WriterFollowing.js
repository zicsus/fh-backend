const db = require("../../db/DB");
const Response = require("../../utils/response/Response");
const Errors = require("../../utils/response/Errors");
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => {

	const uid = req.uid;
	const username = req.params.username;
	const offset = parseInt(req.params.offset);

	const response = new Response(res, uid, "WriterFollowing.js");
	const errors = new Errors();

	if(isNaN(offset)) 
	{
		return response.error(errors.inputs.offset, offset);
	}

	let userText = "SELECT uid FROM writers WHERE username=$1 ORDER BY username LIMIT 1";
	db.query(userText, [username], (err, result) => 
	{
		if(err) 
		{
			return response.error(errors.db.query, err);
		}

		if(result.rowCount == 1) 
		{
			getFollowing(result.rows[0].uid);
		} 
		else 
		{
			response.error(errors.auth.user_not_exists, username);
		}
	});

	function getFollowing(writer) 
	{
		let followingText = "SELECT w.username, w.name, w.dp FROM relations r, writers w WHERE ";
		followingText += "r.follower=$1 AND w.uid=r.following ORDER BY r.date DESC OFFSET $2 LIMIT 20";

		db.query(followingText, [writer, offset], (err, result) => 
		{
			if(err)	
			{
				return response.error(errors.db.query, err);
			}

			const writers = result.rows.map(item => 
			{
				item.dp = mathf.signUrl(item.dp);
				return item;
			});

			response.ok(writers);
		});
	}
}