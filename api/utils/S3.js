const AWS = require('aws-sdk');
const config = require('../secret/s3');

const s3bucket = new AWS.S3(
{
    accessKeyId: config.IAM_USER,
    secretAccessKey: config.IAM_USER_SECRET,
    Bucket: config.BUCKET_NAME,
});


module.exports.upload = (key, file, callback) =>
{
    s3bucket.createBucket(function() 
    {
        let mimetype = file.mimetype.split("/")[1];
        
        let params = {
            Bucket: config.BUCKET_NAME,
            Key: key,
            Body: file.data,
            ContentType: file.mimetype
        };

        s3bucket.upload(params, (err, data) => 
        {
            callback(err, data);
        });
    });
}

module.exports.deleteFile = (key, callback) => 
{
	let params = {
        Bucket: config.BUCKET_NAME,
        Key: key
    };

    s3bucket.deleteObject(params, (err, data) => 
    {
        callback(err, data);
    });
}

