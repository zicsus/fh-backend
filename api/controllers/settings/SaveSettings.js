const moment = require('moment');
const AWS = require('aws-sdk');
const Busboy = require('busboy');
const config = require('../../secret/s3');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const validator = require('../../utils/Validator');

module.exports = (req, res) => {

	const uid = req.uid;
	const name = req.body.name;
	const username = req.body.username;
	const bio = req.body.bio;
	const twitter = req.body.twitter;
	const medium = req.body.medium;
	const instagram = req.body.instagram;
	const website = req.body.website;
	
	console.log(req.body.weekly_digest);

	const weekly = req.body.weekly_digest === "true";
	const date = moment.utc().toDate().toUTCString();

	const response = new Response(res, uid, "SaveSettings.js");
	const errors = new Errors();

	const busboy = new Busboy({headers: req.headers});

	if(bio.length > 500) {
		return response.error(errors.inputs.bio, [bio, uid]);
	}

	if(!validator.isMention("@"+username)) {
		return response.error(errors.inputs.username, [username, uid]);
	}

	if(twitter.length > 30 || medium.length > 30 || instagram.length > 30) {
		return response.error(errors.inputs.social, [twitter, medium, instagram, uid]);
	}

	if(website !== "" && !validator.isUrl(website)) {
		return response.error(errors.inputs.social, [website, uid]);
	}

	// Listen for event when Busboy finds a file to stream.
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype){
        file.on('data', function(data) 
        {});

        // Completed streaming the file.
        file.on('end', function()
        {});
    });

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) 
    {});

    busboy.on('finish', function() {
        if(req.files.dp != undefined) {
            const compatibleFormats = ["image/png", "image/jpg", "image/jpeg"]
            if(compatibleFormats.indexOf(req.files.dp.mimetype.toLowerCase()) > -1) {
                checkUsername(true);
            } else {
                response.error(errors.inputs.file, [req.files.dp.mimetype.toLowerCase, uid]);
            }
        } else {
            checkUsername(false)
        }
    });
    
    req.pipe(busboy);


    checkUsername = (isDp) => {
    	let checkUsernameText = "SELECT uid FROM writers WHERE username=$1 ORDER BY username LIMIT 1";
		db.query(checkUsernameText, [username], (err, result) => {

			if(err) {
				return response.error(errors.db.query, err);
			}

			if(result.rowCount == 1) {
				if(result.rows[0].uid == uid){ 
					checkWeekly(isDp);
				} else {
					response.error(errors.auth.username_in_use, username);
				}
			} else {
				checkWeekly(isDp);
			}
		});
    }
	

	checkWeekly = (isDp) => {

		let checkWeeklyText = "SELECT * FROM newsletter WHERE uid=$1 LIMIT 1";
		db.query(checkWeeklyText, [uid], (err, result) => {

			if(err) {
				return response.errors(errors.db.query, err);
			}
			let status;
			if(result.rowCount == 1 && !weekly) {
				status = -1; 
			} else if(result.rowCount == 0 && weekly) {
				status = 1;
			} else {
				status = 0;
			}

			if(isDp) {
				uploadToS3(status);
			} else {
				update(status, "");
			}
		});
	}

	uploadToS3 = (weeklyStatus) => {

        let s3bucket = new AWS.S3({
            accessKeyId: config.IAM_USER,
            secretAccessKey: config.IAM_USER_SECRET,
            Bucket: config.BUCKET_NAME,
        });

        s3bucket.createBucket(function() {
            let mimetype = req.files.dp.mimetype.split("/")[1];
            let dpKey = "writers/" + uid + "/dp." + mimetype;
            
            let dpParams = {
                Bucket: config.BUCKET_NAME,
                Key: dpKey,
                Body: req.files.dp.data,
                ContentType: req.files.dp.mimetype
            };

            s3bucket.upload(dpParams, function (err, data) {
                if (err) {
                    return response.error(errors.files.upload_failed, [uid]);
                }

                update(weeklyStatus, dpKey);
            });
        });
    }

	update = (weeklyStatus, dpKey) => {
		db.getClient((err, client, release) => {

			if(err) {
	            return response.error(errors.db.connect, err);
	        }

	        (async () => {
	        	let success = true;
	        	try {
	        		
	        		await client.query("BEGIN");

	        		const social = {twitter, medium, instagram, website};
	        		let updateText = "UPDATE writers SET name=$1, username=$2, bio=$3, social=$4";
	        		const updateParams = [name, username, bio, social, uid];
	        		if(dpKey != "") {
	        			updateText += ", dp=$6";
	        			updateParams.push(dpKey);
	        		}
	        		updateText += " WHERE uid=$5";
	        		console.log(updateText);
	        		await client.query(updateText, updateParams);

	        		if(weeklyStatus != 0) {
		        		let newsletterText = "INSERT INTO newsletter(uid, last_sent, date) VALUES($1, $2, $3)";
		        		let newsletterParams = [uid, date, date];
		        		if(weeklyStatus == -1) {
		        			newsletterText = "DELETE FROM newsletter WHERE uid=$1";
		        			newsletterParams = [uid];
		        		}
	        			await client.query(newsletterText, newsletterParams);
	        		}

	        		await client.query("COMMIT");

	        	} catch(err) {
	        		success = false;
	        		console.log(err);
	                await client.query("ROLLBACK");
	        	} finally {
	        		release();
	        		if(success) {
	        			response.ok("");
	        		} else {
	        			response.error(errors.db.transaction, "");
	        		}
	        	}
	        })();
		});
	}
}