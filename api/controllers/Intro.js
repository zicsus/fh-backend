const db = require('../db/DB');
const Response = require('../utils/response/Response');
const Errors = require('../utils/response/Errors');

module.exports = (req, res) =>
{
    const uid = req.uid;
    const type = req.params.type;
    const wid = req.params.wid;

    const response = new Response(res, uid, "Writer.js");
    const errors = Errors();

    const getUserText = "SELECT uid, name, username, dp FROM writers WHERE uid=$1 ORDER BY uid LIMIT 1";

    db.query(getUserText, [uid], (err, result) => 
    {
        if(err)
        {
            return response.error(errors.db.query, err);
        }

        if(result.rowCount == 1)
        {
            response.ok(result.rows[0]);
        }
        else
        {
            response.error(errors.auth.user_not_exists, uid);
        }
    });

}