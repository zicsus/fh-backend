const db = require('../db/DB');
const Response = require('../utils/response/Response');
const Errors = require('../utils/response/Errors');
const mathf = require('../utils/Mathf');

module.exports = (req, res) => {

	const uid = req.uid;

	const response = new Response(res, uid, "Writers.js");
	const errors = new Errors();

	const leaderboard = {};

	let mostReputatedText = "SELECT username, name, dp, reputations FROM writers ORDER BY reputations DESC LIMIT 30";
	db.query(mostReputatedText, [], (err, result) => {

		if(err) {
			response.error(errors.db.query, err);
		}

		const writers = result.rows.map(item => 
		{
			item.dp = mathf.signUrl(item.dp);
			return item;
		});

		leaderboard.most_reputated = writers;
		response.ok(leaderboard);
	});
}