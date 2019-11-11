const Response = require('../../utils/response/Response');

module.exports = (req, res) => 
{
	const uid = req.uid;
	const response = new Response(res, undefined, 'Logout.js');

	response.logout();
}