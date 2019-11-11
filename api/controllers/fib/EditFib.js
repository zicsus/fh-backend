const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');

module.exports = (req, res) => 
{
	const uid = req.uid;
	const storyUrl = req.params.storyUrl;
	const fibId = parseInt(req.params.fibId);
	const fib = req.body.fib;

	const response = new Response(res, uid, "EditFib.js");
	const errors = new Errors();

	const storyArr = storyUrl.split("-");
    if(storyArr.length < 2) 
    {
        return response.error(errors.inputs.story, storyArr);
    }
    const story = parseInt(storyArr[storyArr.length - 1]);
    delete storyArr;

    if(isNaN(story)) 
    {
        return response.error(errors.inputs.story_id, [storyUrl, uid]);
    }

    if(isNaN(fibId)) 
    {
        return response.error(errors.inputs.fibId, [req.body.fibId, uid]);
    }

    if(fib.length < 200 && fib.length > 1000) 
    {
        return response.error(errors.input.fib, [fib, fib.length, uid]);
    }

	const checkText = "SELECT id, writer FROM fibs WHERE story=$1 ORDER BY id DESC LIMIT 1";
	db.query(checkText, [story], (err, result) => 
	{
		if(err)
		{
			response.error(errors.db.query, err);
		}

		if(result.rowCount == 1)
		{
			if(result.rows[0].id == fibId && result.rows[0].writer == uid)
			{
				updateFib();
			}
			else
			{
				response.error(errors.story.not_last_fib, [fibId, story, uid]);
			}
		}
		else 
		{
			response.error(errors.story.fib_not_found, [fibId, story, uid]);
		}
	});

	updateFib = () => 
	{
		const updateText = "UPDATE fibs SET fib=$1 WHERE id=$2";
		db.query(updateText, [fib, fibId], (err, result) => 
		{
			if(err)
			{
				return response.error(error.db.query, err);
			}

			response.ok("");
		});
	} 	
}