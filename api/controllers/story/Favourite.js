const moment = require('moment');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');

module.exports = (req, res) => 
{
	try{
	const uid = req.uid;
	const story = req.body.story;
	const status = req.body.status;
	const date = moment.utc().toDate().toUTCString();

	const response = new Response(res, uid, 'Favourite.js');
	const errors = new Errors();

	const storyArr = story.split("-");
    const storyId = parseInt(storyArr[storyArr.length - 1]);
    delete storyArr;

	if(isNaN(storyId)) {
		return response.error(errors.inputs.story_id, [req.params.story, uid]);
	}

	if(typeof status !== 'boolean') {
		return response.error(errors.inputs.status, [status, uid]);
	}

	const checkText = "SELECT id FROM favourites WHERE uid=$1 AND story=$2 ORDER BY uid LIMIT 1";
	db.query(checkText, [uid, storyId], (err, result) => {

		if(err) {
			response.error(errors.db.query, err);
		}
		console.log(status);
		if(result.rowCount == 1) 
		{
			if(status) 
			{
				response.ok('');
			} 
			else 
			{
				removeFromFavourites();
			}
		} 
		else 
		{
			if(status) 
			{
				addToFavourites();
			} 
			else 
			{
				response.ok('');
			}
		}
	});

	addToFavourites = () => 
	{
		let insertText = "INSERT INTO favourites(date, uid, story) VALUES($1, $2, $3)";
		db.query(insertText, [date, uid, storyId], (err, result) => 
		{
			if(err) 
			{
				return response.error(errors.db.query, err);
			}

			response.ok('');
		});
	}

	removeFromFavourites = () => 
	{
		let removeText = "DELETE FROM favourites WHERE uid=$1 AND story=$2";
		db.query(removeText, [uid, storyId], (err, result) => 
		{
			if(err) 
			{
				return response.error(errors.db.query, err);
			}

			response.ok('');
		});
	}
	}catch(err){console.log(err)}
}