const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
	const uid = req.uid;
	const offset = parseInt(req.params.offset);
	const response = new Response(res, uid, "Events.js");
	const errors = new Errors();

	const events = []; let completed = 0;

	if(isNaN(offset)) 
	{
		return response.error(errors.inputs.offset, [req.params.offset, uid]);
	}

	let checkUserText = "SELECT uid FROM writers WHERE uid=$1 ORDER BY uid LIMIT 1";
	db.query(checkUserText, [uid], (err, result) => 
	{
		if(err) 
		{
			return response.error(errors.db.query, err);
		}

		if(result.rowCount === 1) 
		{
			getEvents();
		} 
		else 
		{
			return response.error(errors.auth.user_not_exists);
		}
	}); 

	getEvents = () => 
	{
		let eventText = "SELECT e.*, w.username, w.name, w.dp FROM events e, writers w WHERE ";
		eventText += "e.w_to=$1 AND e.w_by=w.uid ORDER BY e.date DESC OFFSET $2 LIMIT 20";

		db.query(eventText, [uid, offset], (err, result) => {

			if(err) {
				return response.error(errors.db.query, err);
			}

			let storyEvents = [],
				fibEvents = [],
				commentEvents = [],
				followEvents = [];

			for(let i in result.rows) 
			{
				const event = result.rows[i];
				event.dp = mathf.signUrl(event.dp);
				/* 
					Event Type-
					S - Upvote story
					F - New fib
					G - Upvote fib
					C - New comment
					R - New comment reply
					D - Upvote comment 
					W - Follow
				*/

				if(event.type == 'S' || event.type == 'F' || event.type == 'C') 
				{
					storyEvents.push({index: i, event});
				} 
				else if(event.type == 'G') 
				{
					fibEvents.push({index: i, event});
				}
				else if(event.type == 'R' || event.type == 'D')
				{
					commentEvents.push({index: i, event});
				}
				else
				{
					followEvents.push({index: i, event});
				}
			}

			getStory(storyEvents);
			getFibs(fibEvents);
			getStoryComments(commentEvents);
			pushEvents(followEvents);

			updateEvents();
		});
	}

	getStory = (storyEvents) => {

		const stories = storyEvents.map((item) => {
			return item.event.content.story;
		});

		let storyText = "SELECT id, title FROM stories WHERE id = ANY($1::bigint[]) ORDER BY id LIMIT $2";
		db.query(storyText, [stories, stories.length], (err, result) => {

			if(err) {
				return response.error(errors.db.query, err);
			}

			for(let i in result.rows) {
				
				const story = result.rows[i];
				
				for(let j in storyEvents) {
					
					if(story.id == storyEvents[j].event.content.story) {
						storyEvents[j].event.content.title = story.title;
						storyEvents[j].event.content.url = story.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + story.id; 
					}
				}
			}

			pushEvents(storyEvents);
		});
	}

	getFibs = (fibEvents) => {

		const fibs = fibEvents.map((item) => {
			return item.event.content.fib;
		});

		let fibText = "SELECT f.id, f.fib, f.upvotes, f.downvotes, s.title, s.id AS sid FROM fibs f, stories s WHERE f.id=ANY($1::bigint[]) AND s.id=f.story "
		fibText += "ORDER BY f.id LIMIT $2";
		db.query(fibText, [fibs, fibs.length], (err, result) => {

			if(err) {
				return response.error(errors.db.query, err);
			}

			for(let i in result.rows) {
				
				const fib = result.rows[i];
				
				for(let j in fibEvents) {
					
					if(fib.id == fibEvents[j].event.content.fib) {
						fibEvents[j].event.content.title = fib.title;
						fibEvents[j].event.content.fib = fib.fib;
						fibEvents[j].event.content.upvotes = fib.upvotes;
						fibEvents[j].event.content.donwvotes = fib.donwvotes; 
						fibEvents[j].event.content.url = fib.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + fib.sid; 
					}
				}
			}

			pushEvents(fibEvents);
		});
	}

	getStoryComments = (commentEvents) => 
	{
		const comments = commentEvents.map(item => 
		{
			return item.event.content.comment;
		});

		let commentText = "SELECT c.id, s.title, s.id AS sid FROM story_comments c, stories s WHERE c.id=ANY($1::bigint[]) AND s.id=c.story "
		commentText += "ORDER BY c.id LIMIT $2";

		db.query(commentText, [comments, comments.length], (err, result) => 
		{
			if(err) 
			{
				return response.error(errors.db.query, err);
			}

			for(let i in result.rows) 
			{
				const comment = result.rows[i];
				
				for(let j in commentEvents) 
				{
					if(comment.id == commentEvents[j].event.content.comment) 
					{
						commentEvents[j].event.content.title = comment.title;
						commentEvents[j].event.content.url = comment.title.replace(/[^a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + comment.sid;
					}
				}
			}
			pushEvents(commentEvents);
		});
	}

	pushEvents = (evs) => {
		completed++;

		for(let i in evs) {
			events[evs[i].index] = evs[i].event;
		}

		if(completed == 4) {
			response.ok(events);
		}
	}

	updateEvents = () => 
	{
		const updateText = "UPDATE events SET content = content || jsonb_build_object('seen', true) WHERE w_to=$1 AND (content->>'seen')::boolean=false";
		db.query(updateText, [uid], (err, result) => 
		{
			if(err)
			{
				return response.error(errors.db.query, ["updateEvents", err]);
			}
		});
	}
}