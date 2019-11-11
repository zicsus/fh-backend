const db = require('../db/DB');
const Response = require('../utils/response/Response');
const Errors = require('../utils/response/Errors');

module.exports = (req, res) => {

	const uid = req.uid;
	const offset = parseInt(req.params.offset);
	const response = new Response(res, uid, "Tags.js");
	const errors = new Errors();

	if(isNaN(offset)) {
		return response.error(errors.inputs.offset, [offset, uid]);
	}

	const tagsText = "SELECT * FROM tags ORDER BY stories DESC OFFSET $1 LIMIT 20";
	db.query(tagsText, [offset], (err, result) => {

		if(err) {
			return response.error(errors.db.query, err);
		}

		response.ok(result.rows);
	});

}