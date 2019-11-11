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
    const draftUrl = req.params.draft;
    const title = req.body.title;
    const description = req.body.description;
    let genre = req.body.genre;
    let tags = req.body.tags;
    const private = req.body.private == 'true';
    const date = moment.utc().toDate().toUTCString();

    const response = new Response(res, uid, "EditDraft.js");
    const errors = new Errors();

    const draftArr = draftUrl.split("-");
    const draft = draftArr[draftArr.length - 1];
    delete draftArr;

    if(isNaN(draft))
    {
        return response.error(errors.inputs.draft, draftUrl);
    }

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
        return response.error(error.inputs.private, [private, uid]);
    }

    let tagsJson = [];
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

    let coverKey = "";
    checkUser = () => 
    {
        let checkUserText = "SELECT d.cover, w.elite FROM drafts d, writers w WHERE ";
        checkUserText += "d.id=$1 AND d.author=$2 AND w.uid=d.author ORDER BY d.author LIMIT 1";
        db.query(checkUserText, [draft, uid], (err, result) => {
            if(err) 
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount === 1) 
            {
                if((private && result.rows[0].elite) || !private)
                {
                    coverKey = result.rows[0].cover;
                    getGenre();
                }
                else
                {
                    return response.error(error.auth.not_elite, [private, uid]);
                }
            } 
            else 
            {
                return response.error(errors.auth.draft_not_found, draftUrl);
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
                
                if(req.files.cover)
                {
                    uploadToS3();
                }
                else
                {
                    saveDraft(coverKey);
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
        const newCoverKey = "stories/" + folderName + "/" + name + "." + mimetype;

        S3.upload(newCoverKey, req.files.cover, (err, data) => 
        {
            if(err)
            {
                return response.error(errors.files.upload_failed, [uid]);
            }

            if(coverKey !== "")
            {
                deleteFromS3(newCoverKey);
            }
            else
            {
                saveDraft(newCoverKey)
            }
        });
    }

    deleteFromS3 = (newCoverKey) => 
    {
        S3.deleteFile(coverKey, (err, data) => 
        {
            if(err)
            {
                console.log("--- FROM EDITDRAFT.JS - ", err);
            }
            saveDraft(newCoverKey);
        });
    }

    saveDraft = (newCoverKey) => 
    {
        let updateText = "UPDATE drafts SET title=$1, description=$2, cover=$3, ";
        updateText += "genre=$4, tags=$5, private=$6 WHERE id=$7";
        const updateParams = [title, description, newCoverKey, genre, tags, private, draft];
        db.query(updateText, updateParams, (err, result) => 
        {
            if(err)
            {
                return response.error(errors.db.query, err);
            }

            response.ok("");
        }); 
    }
} 