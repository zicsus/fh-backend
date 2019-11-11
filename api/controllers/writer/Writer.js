const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const validator = require('../../utils/Validator');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => {

	const uid = req.uid;
	const username = req.params.username;

	const response = new Response(res, uid, "Writer.js");
	const errors = new Errors();

	if(!validator.isMention("@" + username)) {
		return response.error(errors.input.username, username);
	}	

	let userText = "SELECT uid, name, username, dp, bio, following, followers, stories, ";
	userText += "fibs, reputations, social FROM writers WHERE username=$1 ORDER BY username LIMIT 1";
	db.query(userText, [username], (err, result) => {

		if(err) {
			return response.error(errors.db.query, err);
		}

		if(result.rowCount == 1) {
			result.rows[0].dp = mathf.signUrl(result.rows[0].dp);
			if(uid !== undefined && uid !== result.rows[0].uid) {
				getRelation(result.rows[0]);
			} else {
				response.ok(result.rows[0]);
			}		
		} else {
			response.error(errors.auth.user_not_exists);
		}

	});

	getRelation = (writer) => {
		relationText = "SELECT * FROM relations WHERE follower=$1 AND following=$2 ORDER BY follower LIMIT 1";
		db.query(relationText, [uid, writer.uid], (err, result) => {

			if(err) {
				return response.error(errors.db.query, err);
			}

			writer.related = false;

			if(result.rowCount === 1) {
				writer.related = true;
			}

			response.ok(writer);
		});
	}
}