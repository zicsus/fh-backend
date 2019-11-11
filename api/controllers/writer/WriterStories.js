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
			getStories(result.rows[0].uid, result.rows[0].name, result.rows[0].dp);
		} else {	
			response.error(errors.auth.user_not_exists, username);
		}

	});

	function getStories(writer, name, dp) {

		let storiesText = "SELECT id, title, description, cover, comments, upvotes, downvotes, ";
		storiesText += "fibs, tags FROM stories WHERE author=$1 ORDER BY date DESC OFFSET $2 LIMIT 20";

		db.query(storiesText, [writer, offset], (err, result) => {

			if(err) {
				return response.error(errors.db.query, err);
			}

			const stories = result.rows.map((item) => 
	        {
	        	item.cover = mathf.signUrl(item.cover);
	            item.url = item.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + item.id;
	            item.description = item.description.substring(0, 100) + "...";
	            item.tags = item.tags.split(', ');
	            item.username = username;
	            item.name = name;
	            item.dp = dp;
	            return item;
	        });
			console.log(stories);
			response.ok(stories);

		});

	}

	
}