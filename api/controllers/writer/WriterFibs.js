const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => {
	const uid = req.uid;
	const username = req.params.username;
	const offset = req.params.offset;

	const response = new Response(res, uid, "WriterStories.js");
	const errors = new Errors(); 

	let userText = "SELECT uid, name, dp FROM writers WHERE username=$1 ORDER BY username LIMIT 1";
	db.query(userText, [username], (err, result) => {

		if(err) {
			return response.error(errors.db.query, err);
		}

		if(result.rowCount == 1) {
			getFibs(result.rows[0].uid, 
				    result.rows[0].name, 
				    mathf.signUrl(result.rows[0].dp));
		} else {	
			response.error(errors.auth.user_not_exists, username);
		}

	});

	function getFibs(writer, name, dp) {

		let fibText = "SELECT f.*, s.title, s.cover, s.id AS sid FROM fibs f, stories s WHERE f.writer=$1 AND ";
		fibText += "s.id=f.story ORDER BY f.date DESC OFFSET $2 LIMIT 20";

		db.query(fibText, [writer, offset], (err, result) => {

			if(err) {
				return response.error(errors.db.query, err);
			}

			const fibs = result.rows.map(item => {
	            item.url = item.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + item.sid;
	            item.username = username;
	            item.name = name;
	            item.dp = dp;
	            delete item.sid;
	            return item;
			});

			response.ok(fibs);

		});

	}

	
}