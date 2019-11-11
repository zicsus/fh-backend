const moment = require('moment');
const Busboy = require('busboy');
const mathf = require('../../utils/Mathf');
const validator = require('../../utils/Validator');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const S3 = require('../../utils/S3');

module.exports = (req, res) => 
{
    const busboy = new Busboy({headers: req.headers});
    const uid = req.uid;
    const title = req.body.title;
    const description = req.body.description;
    let genre = req.body.genre;
    let tags = req.body.tags;
    const private = req.body.private == 'true';
    const date = moment.utc().toDate().toUTCString();

    const response = new Response(res, uid, "NewDraft.js");
    const errors = new Errors();

    let tagsJson = [];

    if(title.trim() != "" && title.length > 100) 
    {
        return response.error(errors.inputs.title, "");
    }

    if(description.trim() != "" && description.length > 500) 
    {
        return response.error(errors.inputs.description, "");
    }

    if(private != true && private != false)
    {
        return response.error(errors.inputs.private, [private, uid]);
    }

    try 
    {
        tagsJson = JSON.parse(tags, true);
        tags = "";
        let flag = false;
        for(let tag in tagsJson) 
        {
            if(!validator.isTag(tagsJson[tag])) 
            {
                flag = true;
                break;
            } 
            else 
            {
                if(tag == 4 || tag == tagsJson.length - 1) 
                {
                    tags += tagsJson[tag];
                    break;
                } 
                else 
                {
                    tags += tagsJson[tag] + ", ";
                }
            }
        }

        if(flag) 
        {
            throw new Error(tagsJson);
        }
    } 
    catch(err) 
    {
        return response.error(errors.inputs.tag, err);
    }

    // Listen for event when Busboy finds a file to stream.
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype)
    {
        file.on('data', function(data) 
        {});

        // Completed streaming the file.
        file.on('end', function()
        {})
    });

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) 
    {});

    busboy.on('finish', function() 
    {
        if(req.files.cover != undefined) 
        {
            const compatibleFormats = ["image/png", "image/jpg", "image/jpeg"]
            if(compatibleFormats.indexOf(req.files.cover.mimetype.toLowerCase()) > -1) 
            {
                checkUser();
            } 
            else 
            {
                response.error(errors.inputs.file, [req.files.cover.mimetype.toLowerCase, uid]);
            }
        } 
        else 
        {
            checkUser();
        }
    });
    
    req.pipe(busboy);

    checkUser = () => 
    {
        let checkUserText = "SELECT username, elite FROM writers WHERE uid=$1 ORDER BY uid LIMIT 1";
        db.query(checkUserText, [uid], (err, result) => 
        {
            if(err) 
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount === 1) 
            {
                if((private && result.rows[0].elite) || !private)
                {
                    getGenre();
                }
                else
                {
                    return response.error(errors.auth.not_elite, [private, uid]);
                }
            } 
            else 
            {
                return response.error(errors.auth.user_not_exists, "");
            }
        });
    }
    
    getGenre = () => 
    {
        const getGenre = "SELECT id from genres WHERE name=$1 ORDER BY name LIMIT 1";
        db.query(getGenre, [genre], (err, result) => {
            
            if(err) 
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount === 1) 
            {
                genre = result.rows[0].id;
                
                if(req.files.cover != undefined)
                {
                    uploadToS3();
                }
                else
                {
                    saveDraft("");
                }
            } 
            else 
            {
                return response.error(errors.input.genre, genre);
            }
        });
    }

    uploadToS3 = () => 
    {
        const mimetype = req.files.cover.mimetype.split("/")[1];
        const name = mathf.randomString(10);
        const folderName = mathf.randomString(20);
        const coverKey = "stories/" + folderName + "/" + name + "." + mimetype;

        S3.upload(coverKey, req.files.cover, (err, data) => 
        {
            if(err)
            {
                return response.error(errors.files.upload_failed, [uid]);
            }

            saveDraft(coverKey);
        });
    }

    saveDraft = (coverKey) => 
    {
        let insertText = "INSERT INTO drafts (date, title, description, cover, ";
        insertText += "genre, tags, private, author) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
        const insertParams = [date, title, description, coverKey, genre, tags, private, uid];
        db.query(insertText, insertParams, (err, result) => 
        {
            if(err)
            {
                S3.deleteFile(coverKey, (err, data) => {});
                return response.error(errors.db.query, err);
            }

            response.ok("");
        }); 
    }
} 