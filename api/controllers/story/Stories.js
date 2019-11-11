const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const validator = require('../../utils/Validator');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
	try {
	const uid = req.uid;
	const type = req.params.type;
	const name = req.params.name;
	const offset = parseInt(req.params.offset);

	const response = new Response(res, uid, "Stories.js");
	const errors = new Errors();

	if(isNaN(offset)) {
		return response.error(errors.inputs.offset, [req.params.offset, uid]);
	}

	if(name.length > 25 && !validator.isTag('#' + name)) {
		return response.error(errors.inputs.name, [req.params.name, uid]);
	}


	getTag = () => 
	{
		const tagText = "SELECT stories FROM tags WHERE name=$1 ORDER BY name LIMIT 1";
		db.query(tagText, ["#"+name], (err, result) => {
			if(err) 
			{
				return response.error(errors.db.query, err);
			}

			if(result.rowCount == 1) 
			{
				if(result.rows[0].stories === 0) 
				{
					return response.ok([]);
				}

				const {storyText, storyParams} = getTagStoryText();
					getStories(storyText, storyParams, (storiesArr) => 
					{
						const stories = storiesArr.map((item) => {
							item.cover = mathf.signUrl(item.cover);
			                item.url = item.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + item.id;
			                item.description = item.description.substring(0, 100) + "...";
			                item.tags = item.tags.split(', ');
			                return item;
			            });

			            response.ok(stories);
					});
			} 
			else 
			{
				response.error(errors.story.tag_not_found, [name, uid]);
			}
		});
	}

	getGenre = () => 
	{
		const genreText = "SELECT id, stories FROM genres WHERE name=$1 ORDER BY name LIMIT 1";
		db.query(genreText, [name], (err, result) => {

			if(err) 
			{
				return response.error(errors.db.query, err);
			}

			if(result.rowCount == 1) 
			{
				if(result.rows[0].stories === 0) 
				{
					return response.ok([]);
				}

				const {storyText, storyParams} = getGenreStoryText(result.rows[0].id);
				getStories(storyText, storyParams, (storiesArr) => {
					const stories = storiesArr.map((item) => {
						item.cover = mathf.signUrl(item.cover);
						item.genre = name;
		                item.url = item.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + item.id;
		                item.description = item.description.substring(0, 100) + "...";
		                item.tags = item.tags.split(', ');
		                return item;
		            });

		            response.ok(stories);
				});
			} 
			else 
			{
				response.error(errors.story.genre_not_found, [name, uid]);
			}

		});
	}

	getStories = (storyText, storyParams, callback) => 
	{		
		db.query(storyText, storyParams, (err, result) => 
		{
			if(err) 
			{
				return response.error(errors.db.query, err);
			}

			callback(result.rows);
		});
	}

	getTagStoryText = () => 
	{
		let storyText = "SELECT s.id, s.cover, s.title, s.description, s.upvotes, s.comments, ";
    	storyText += "s.downvotes, s.contributors, s.fibs, s.tags, g.name as genre, w.username, w.uid, w.dp, ";
    	storyText += "w.name from stories s, writers w, genres g WHERE s.tags ILIKE '%' || $1 || '%' ";
    	storyText += "AND s.author=w.uid AND g.id=s.genre ORDER BY s.id OFFSET $2 LIMIT 20";
    	const storyParams = [name, offset];

    	return {storyText, storyParams};
	}

	getGenreStoryText = (genreId) => 
	{
		let storyText = "SELECT s.id, s.cover, s.title, s.description, s.upvotes, s.comments, ";
    	storyText += "s.downvotes, s.contributors, s.fibs, s.tags, w.username, w.uid, w.dp, ";
    	storyText += "w.name from stories s, writers w WHERE s.genre=$1 AND s.author=w.uid ";
    	storyText += "ORDER BY s.id OFFSET $2 LIMIT 20";
    	const storyParams = [genreId, offset];

    	return {storyText, storyParams};
	}


	//Call respective functions
	switch(type) 
	{
		case 'tag':
			getTag();
			break;
		case 'genre':
			getGenre();
			break;
		default:
			response.error(errors.inputs.type, [req.params.type, uid]);
			break;
	}

	}catch(err) {console.log(err);}
} 