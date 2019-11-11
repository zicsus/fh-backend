const moment = require('moment');
const Busboy = require('busboy');
const S3 = require('../../utils/S3');
const mathf = require('../../utils/Mathf');
const validator = require('../../utils/Validator');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');

module.exports = (req, res) => 
{
    const busboy = new Busboy({headers: req.headers});
    const uid = req.uid;
    const title = req.body.title;
    const description = req.body.description;
    const private = req.body.private == 'true';
    const draftUrl = req.body.draft;
    let genre = req.body.genre;
    let tags = req.body.tags;
    
    const date = moment.utc().toDate().toUTCString();

    const response = new Response(res, uid, "NewStory.js");
    const errors = new Errors();

    let draft = undefined;
    if(draftUrl !== undefined && draftUrl !== "")
    {
        const draftArr = draftUrl.split("-");
        draft = draftArr[draftArr.length - 1];

        if(isNaN(draft))
        {
            return response.error(errors.inputs.draft, draftUrl);
        }
    }

    if(title.trim() != "" && title.length > 100) 
    {
        return response.error(errors.inputs.title, [title, uid]);
    }

    if(description.trim() != "" && description.length > 500) 
    {
        return response.error(errors.inputs.description, [description, uid]);
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
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype){
        file.on('data', function(data) 
        {});

        // Completed streaming the file.
        file.on('end', function()
        {})
    });

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) 
    {});

    busboy.on('finish', function() {
        if(req.files.cover != undefined) 
        {
            const compatibleFormats = ["image/png", "image/jpg", "image/jpeg"];
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
            if(draft)
            {
                checkUser();
            }
            else
            {
                response.error(errors.inputs.file, uid);
            }
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
                    return response.error(error.auth.not_elite, [private, uid]);
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
            
            if(err) {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount === 1) 
            {
                genre = result.rows[0].id;
                checkTags();
            } 
            else 
            {
                return response.error(errors.input.genre, genre);
            }
        })
    }

    checkTags = () => 
    {    
        if(tagsJson.length === 0) 
        {
            if(draft)
            {
                return checkDraft([], []);
            }
            else
            {
                return uploadToS3([], []);
            }
        }

        let checkTopicText = "SELECT name FROM tags WHERE name = ANY($1::text[]) ORDER BY name LIMIT 5"
        db.query(checkTopicText, [tagsJson], (err, result) => 
        {
            if(err)
            {
                return response.error(errors.db.query, err);
            }

            let toUpdate = [],
                toCreate = [];

            for(let i in tagsJson)
            {
                let tag = tagsJson[i];
                let flag = false;
                for(let j in result.rows)
                {
                    if(result.rows[j].name == tag)
                    {
                       toUpdate.push(tag);
                       flag = true;
                       break; 
                    }
                }

                if(!flag)
                {
                    toCreate.push(tag);
                }
            }

            if(draft)
            {
                checkDraft(toUpdate, toCreate);
            }
            else
            {
                uploadToS3(toUpdate, toCreate);
            }
        });
    }

    checkDraft = (toUpdate, toCreate) => 
    {
        const checkDraftText = "SELECT cover FROM drafts WHERE id=$1 AND author=$2 ORDER BY id LIMIT 1";
        db.query(checkDraftText, [draft, uid], (err, result) => 
        {
            if(err)
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount == 1)
            {
                if(req.files.cover)
                {
                    uploadToS3(toUpdate, toCreate);
                }
                else if(req.files.cover == undefined && result.rows[0].cover != "")
                { 
                    createStory(toUpdate, toCreate, result.rows[0].cover);
                }
                else
                {
                    response.error(errors.inputs.file, [draft, uid]);
                }
            }
            else
            {
                return response.error(errors.auth.draft_not_found, draftUrl);
            }
        });
    }

    uploadToS3 = (toUpdate, toCreate) => 
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

            createStory(toUpdate, toCreate, coverKey);
        });
    }

    createStory = (toUpdate, toCreate, coverKey) => 
    {
        db.getClient((err, client, release) => 
        {
            if(err)
            {
                return response.error(errors.db.connect, err);
            }

            (async () => 
            {
                let success = true;
                try
                {
                    await client.query("BEGIN");


                    let insertText = "INSERT INTO stories (date, last_update, title, description, cover, published, ";
                    insertText += "private, reads, comments, upvotes, downvotes, forked, fibs, author, genre, tags, contributors)";
                    insertText += "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)";
                    const insertParams = [date, date, title, description, coverKey, !private, private, 0, 0, 0, 0, {}, 0, uid, genre, tags, 0];
                    await client.query(insertText, insertParams);

                    const updateUserText = "UPDATE writers SET stories = stories + 1 WHERE uid=$1";
                    await client.query(updateUserText, [uid]);
                    
                    const updateGenreText = "UPDATE genres SET stories = stories + 1 WHERE id=$1";
                    await client.query(updateGenreText, [genre]);

                    if(draft)
                    {
                        const deleteDraft = "DELETE FROM drafts WHERE id=$1 AND author=$2";
                        await client.query(deleteDraft, [draft, uid]);
                    }

                    //Create or update tags.
                    if(toUpdate.length !== 0)
                    {
                        const updateTopicText = "UPDATE tags SET stories = stories + 1 WHERE name=ANY($1::text[])";
                        await client.query(updateTopicText, [toUpdate]);
                    }
                    const createTopicText = "INSERT INTO tags (date, by, name, stories) VALUES($1, $2, $3, $4)";
                    for(let i in toCreate)
                    {
                        await client.query(createTopicText, [date, uid, toCreate[i], 1]);
                    }

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
                        getStory(coverKey);
                    }
                    else
                    {
                        response.error(errors.db.transaction);
                    }
                }
            })();
        });
    }

    getStory = (coverKey) => 
    {
        let storyText = "SELECT id FROM stories WHERE title=$1 AND description=$2 ";
        storyText += "AND date=$3 AND cover=$4 ORDER BY id DESC LIMIT 1";
        db.query(storyText, [title, description, date, coverKey], (err, result) => 
        {
            if(err)
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount == 1)
            {
                response.ok(mathf.generateStoryUrl(title, result.rows[0].id));
            }
            else
            {
                response.error(errors.story.story_not_found, storyUrl);
            }
        });
    }
} 