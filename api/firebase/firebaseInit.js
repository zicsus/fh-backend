const config = require('./config.json');
const admin = require('firebase-admin');

module.exports = admin.initializeApp({
    credential: admin.credential.cert(config)
});