const moment = require('moment');
const Busboy = require('busboy');
const validator = require('../../utils/Validator');
const db = require('../../db/DB');
const Response = require('../../utils/response/Response');
const Errors = require('../../utils/response/Errors');
const S3 = require('../../utils/S3');
const mathf = require('../../utils/Mathf');

module.exports = (req, res) => 
{
    const busboy = new Busboy({headers: req.headers});
    const uid = req.uid;
    const storyUrl = req.params.story;
    const title = req.body.title;
    const description = req.body.description;
    let genre = req.body.genre;
    const date = moment.utc().toDate().toUTCString();

    const response = new Response(res, uid, "EditStory.js");
    const errors = new Errors();

    const storyArr = storyUrl.split("-");
    const storyId = parseInt(storyArr[storyArr.length - 1]);
    delete storyArr;

    console.log(genre);

    if(isNaN(storyId))
    {
        return response.error(errors.inputs.story_id, storyUrl);
    }

    if(title.trim() != "" && title.length > 100) 
    {
        return response.error(errors.inputs.title, [title, uid]);
    }

    if(description.trim() != "" && description.length > 500) 
    {
        return response.error(errors.inputs.description, [description, uid]);
    }

    /*let tagsJson = [];
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
    }*/

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
            checkUser();
        }
    });
    req.pipe(busboy);

    let story = {}; let tagsToUpdate = [], tagsToCreate = [];
    checkUser = () => 
    {
        let checkUserText = "SELECT s.* FROM stories s, writers w WHERE s.id=$1 AND ";
        checkUserText += "s.author=$2 AND w.uid=s.author ORDER BY s.id LIMIT 1";

        db.query(checkUserText, [storyId, uid], (err, result) => 
        {
            if(err) 
            {
                return response.error(errors.db.query, err);
            }

            if(result.rowCount === 1)
            {
                story = result.rows[0];
                story.title = title;
                story.description = description;
                getGenre();
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
                    updateStory();
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

            deleteFromS3(coverKey);
        });
    }

    deleteFromS3 = (coverKey) => 
    {
        S3.deleteFile(story.cover, (err, data) => 
        {
            if(err)
            {
                console.log("--- FROM EDITSTORY.JS - ", err);
            }

            story.cover = coverKey; 
            updateStory();
        });
    }

    updateStory = () => 
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

                    let updateText = "UPDATE stories SET title=$1, description=$2, ";
                    updateText += "genre=$3, cover=$4 WHERE id=$5";
                    await client.query(updateText, [story.title, story.description, genre, story.cover, storyId]);

                    if(story.genre !== genre)
                    {
                        let updateGenreText = "UPDATE genres SET stories = CASE WHEN id=$1 ";
                        updateGenreText += "THEN stories + 1 WHEN id=$2 THEN stories - 1 ";
                        updateGenreText += "END WHERE id IN ($1, $2)";
                        await client.query(updateGenreText, [genre, story.genre]); 
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
                        response.ok("");
                    }
                    else
                    {
                        response.error(errors.db.transaction);
                    }
                }
            })();
        })
    }
} 