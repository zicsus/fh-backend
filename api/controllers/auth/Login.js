const moment = require('moment');
const admin = require('../../firebase/firebaseInit');
const db = require('../../db/DB');
const validator = require('../../utils/Validator');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');

module.exports = (req, res) =>
{
    const token = req.token;

    const response = new Response(res, "", "Auth.js");
    const errors = Errors();

    admin.auth().verifyIdToken(token)
    .then(function(decodedToken) 
    {
        response.setUid(decodedToken.uid);
        login(decodedToken.uid);  
    })
    .catch(function(err) 
    {
        response.error(errors.firebase.token, err);
    });

    login = (uid) => 
    {
        let checkUserText = "SELECT uid, username, name, dp FROM writers WHERE uid=$1 ";
        checkUserText += "ORDER BY uid LIMIT 1";

        db.query(checkUserText, [uid], (err, result) => 
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
                response.error(errors.auth.user_not_exists, "")
            }
        });
    }  

}