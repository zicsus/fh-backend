const moment = require('moment');
const admin = require('../../firebase/firebaseInit');
const db = require('../../db/DB');
const validator = require('../../utils/Validator');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) =>
{
    const token = req.token;
    const name = req.body.name;
    const email = req.body.email;
    const username = mathf.generateUsername(email);
    const dp = req.body.dp;
    const medium = req.body.medium;
    const social = {};
    const date = moment.utc().toDate().toUTCString();

    const response = new Response(res, "", "Register.js");
    const errors = Errors();

    if(name == undefined || name.length > 30)
    {
        return response.error(errors.inputs.name, name);
    }

    if(username == undefined || username.length > 30 || !validator.isMention("@"+username))
    {
        return response.error(errors.inputs.username, username);
    }

    if(email == undefined || email.length > 50 || !validator.isEmail(email))
    {
        return response.error(errors.inputs.email, email);
    }

    if(medium == undefined || medium.length > 1 || !validator.isMedium(medium))
    {
        return response.error(errors.inputs.medium, medium);
    }

    admin.auth().verifyIdToken(token)
    .then(function(decodedToken) 
    {
        let uid = decodedToken.uid;
        response.setUid(decodedToken.uid);
        register(uid);        
    })
    .catch(function(err) 
    {
        response.error(errors.firebase.token, err);
    });

    register = (uid) =>
    {
        let checkUserText = "SELECT uid, email, username FROM writers WHERE email=$1 OR username=$2 ";
        checkUserText += "ORDER BY email, username LIMIT 1";

        db.query(checkUserText, [email, username], (err, result) => 
        {
            if(err)
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount != 0)
            {
                if(result.rows[0].email == email)
                {
                    return response.error(errors.auth.user_already_exists, {email: email});
                }  
                else
                {
                    return response.error(errors.auth.username_in_use, {username: username});
                }
            }
            insert();
        });

        insert = () =>
        {
            db.getClient((err, client, release) => 
            {
                if(err)
                {
                    return response.error(errors.db.connect, err)
                }

                (async () => 
                {
                    let success = true;
                    try
                    {
                        await client.query("BEGIN");

                        let insertText = "INSERT INTO writers (uid, date, medium, username, name, email, ";
                        insertText += "gender, bio, dp, followers, following, stories, fibs, drafts, social, elite, ";
                        insertText += "last_active, reputations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)";
                        const insertParams = [uid, date, medium, username, name, email, "", "", dp, 0, 0, 0, 0, 0, social, false, date, 0];
                        await client.query(insertText, insertParams);

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
                            response.error(errors.db.transaction);
                        }
                    }
                })().catch(e => {
                    response.error(errors.db.transaction);
                    console.log(e.stack);
                });
            })
        }
    }
}