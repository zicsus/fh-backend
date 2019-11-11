const moment = require('moment');
const db = require("../../db/DB");
const Response = require("../../utils/response/Response");
const Errors = require("../../utils/response/Errors");
const validator = require("../../utils/Validator");

module.exports = (req, res) => 
{
	const uid = req.uid;
	const username = req.params.username;
	const date = moment.utc().toDate().toUTCString();

	const response = new Response(res, uid, "Follow.js");
	const errors = new Errors();

	if(!validator.isMention("@"+username)) 
	{
		return response.error(errors.inputs.username, username);
	}

	let checkUsersText = "SELECT uid FROM writers WHERE (username=$1 OR uid=$2) ORDER BY username, uid LIMIT 2";
	db.query(checkUsersText, [username, uid], (err, result) => {

		if(err) 
		{
			return response.error(errors.db.query, err);
		}

		if(result.rowCount == 2)
		{	
			let writer;
			if(uid == result.rows[0].uid) 
			{
				writer = result.rows[1].uid;
			} 
			else 
			{
				writer = result.rows[0].uid;
			}
			checkRelated(writer);
		} 
		else 
		{
			return response.error(errors.auth.user_not_exists, [username, uid]);
		}
	});

	checkRelated = (writer) => {
		let checkRelatedText = "SELECT id FROM relations WHERE follower=$1 AND following=$2 ORDER BY follower LIMIT 1";
		db.query(checkRelatedText, [uid, writer], (err, result) => {

			if(err) {
				return response.error(errrors.db.query);
			}

			if(result.rowCount === 1) 
			{
				response.ok("");
			} 
			else 
			{
				follow(writer);
			}

		});
	}

	follow = (writer) => {

		db.getClient((err, client, release) => 
		{
			if(err) 
			{
                return response.error(errors.db.connect, err);
            }

            (async () => 
            {
            	let success = true;
            	try 
            	{
            		await client.query("BEGIN");

            		let insertText = "INSERT INTO relations(date, follower, following) VALUES($1, $2, $3)";
            		await client.query(insertText, [date, uid, writer]);

            		let updateText = "UPDATE writers SET following = CASE WHEN uid=$1 THEN following ";
            		updateText += "WHEN uid=$2 THEN following + 1 END, followers = CASE WHEN uid=$1 THEN followers + 1 ";
            		updateText += "WHEN uid=$2 THEN followers END WHERE uid IN ($1, $2)";
            		await client.query(updateText, [writer, uid]);

            		let eventText = "INSERT INTO events(w_by, w_to, type, content, date) VALUES";
                    eventText += "($1, $2, $3, $4, $5)";
                    await client.query(eventText, [uid, writer, 'W', {seen:false}, date]);
                     
            		await client.query("COMMIT");

            	} 
            	catch(err) 
            	{
            		success = false;
                    await client.query("ROLLBACK");
                    console.log(err);
            	} 
            	finally 
            	{
            		release();
            		if(success) 
            		{
            			response.ok("");
            		} 
            		else 
            		{
            			response.error(errors.db.transaction, "");
            		}
            	}
            })();
		});
	}

}