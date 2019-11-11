const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const validator = require('../../utils/Validator');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => {

	const uid = req.uid;

	const response = new Response(res, uid, "GetSettings.js");
	const errors = new Errors();

	let userText = "SELECT name, username, dp, bio, social ";
	userText += "FROM writers WHERE uid=$1 ORDER BY uid LIMIT 1";
	db.query(userText, [uid], (err, result) => {

		if(err) {
			return response.error(errors.db.query, err);
		}

		if(result.rowCount == 1) {
			let social = result.rows[0].social
			if(social.twitter !== undefined && social.twitter.trim() !== ""){
				result.rows[0].twitter = social.medium; 
			} else {
				result.rows[0].twitter = ""; 
			}

			if(social.medium !== undefined && social.medium.trim() !== ""){
				result.rows[0].medium = social.medium; 
			} else {
				result.rows[0].medium = ""; 
			}

			if(social.instagram !== undefined && social.instagram.trim() !== ""){
				result.rows[0].instagram = social.instagram; 
			} else {
				result.rows[0].instagram = ""; 
			}

			if(social.website !== undefined && social.website.trim() !== ""){
				result.rows[0].website = social.website; 
			} else {
				result.rows[0].website = ""; 
			}
			delete result.rows[0].social;

			result.rows[0].dp = mathf.signUrl(result.rows[0].dp);
			checkNewsletter(result.rows[0]);	

		} else {
			response.error(errors.auth.user_not_exists);
		}
	});

	checkNewsletter = (writer) => {

		let newsletterText = "SELECT uid FROM newsletter WHERE uid=$1 ORDER BY uid LIMIT 1";
		db.query(newsletterText, [uid], (err, result) => {

			if(err) {
				return response.error(errros.db.query, err);
			}

			writer.weekly_digest = false;

			if(result.rowCount === 1) {
				writer.weekly_digest = true;
			}
			response.ok(writer);
		});

	}
}