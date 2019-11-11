const db = require('../db/DB');
const Response = require('../utils/response/Response');
const Errors = require('../utils/response/Errors');
const mathf = require('../utils/Mathf');

module.exports = (req, res) => 
{
	const response = new Response(res, undefined, "Jumbotron.js");
	const errors = new Errors();


	const usersText = "SELECT dp FROM writers WHERE dp!='' ORDER BY date DESC LIMIT 8";
	db.query(usersText, [], (err, result) => 
	{
		if(err) 
		{
			return response.error(errors.db.query, err);
		}

		const writers = result.rows.map((item) => 
		{
			item.dp = mathf.signUrl(item.dp);
			return item.dp;
		})

		response.ok(writers);
	});
}