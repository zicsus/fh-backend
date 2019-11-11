const db = require("../../db/DB");
const Response = require("../../utils/response/Response");
const Errors = require("../../utils/response/Errors");
const validator = require("../../utils/Validator");

module.exports = (req, res) => {

	const uid = req.uid;
	const username = req.params.username;

	const response = new Response(res, uid, "Unfollow.js");
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
			return response.error(errors.auth.user_not_exists, [writer, uid]);
		}

	});
	
	checkRelated = (writer) => 
	{
		let checkRelatedText = "SELECT id FROM relations WHERE follower=$1 AND following=$2 ORDER BY follower LIMIT 1";
		db.query(checkRelatedText, [uid, writer], (err, result) => {

			if(err) 
			{
				return response.error(errrors.db.query);
			}

			if(result.rowCount === 1) 
			{
				unfollow(writer);
			} 
			else 
			{
				response.ok("");
			}

		});
	}

	unfollow = (writer) => 
	{
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

            		let deleteText = "DELETE FROM relations WHERE follower=$1 AND following=$2";
            		await client.query(deleteText, [uid, writer]);

            		let updateText = "UPDATE writers SET following = CASE WHEN uid=$1 THEN following ";
            		updateText += "WHEN uid=$2 THEN following - 1 END, followers = CASE WHEN uid=$1 THEN followers - 1 ";
            		updateText += "WHEN uid=$2 THEN followers END WHERE uid IN ($1, $2)";
            		await client.query(updateText, [writer, uid]);

            		const eventText = "DELETE FROM events WHERE w_by=$1 AND w_to=$2 AND type='W'";
            		await client.query(eventText, [uid, writer]);

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