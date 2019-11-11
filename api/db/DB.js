const pg = require('pg');

// configuration for postres for connecting.
let user = "user", 
    database = "database", 
    password = "1234",
    port = 5432,
    host = "localhost";

if(process.env.NODE_ENV == "production")
{
    user = process.env.RDS_USERNAME;
    database = process.env.RDS_DB_NAME;
    password = process.env.RDS_PASSWORD;
    port = process.env.RDS_PORT;
    host = process.env.RDS_HOSTNAME;
}


const pgConfig = {
    user: user,
    database: database,
    password: password,
    port: port,
    host: host
};

// setting timestamp for the postgres.
pg.types.setTypeParser(1184, function(stringValue)
{
    console.log(stringValue)
    return new Date(Date.parse(Date.parse(stringValue + "+0000")))
});

pg.defaults.poolSize = 20;

const pool = new pg.Pool(pgConfig)

module.exports = {
    query : (text, params, callback) => 
    {
        const start = Date.now();
        return pool.query(text, params, (err, res) => 
        {
            if(err)
            {
                console.log(err);
            }
            const duration = Date.now() - start;
            console.log('excuted query', {text, duration : duration+"ms", rows: res.rowCount});
            callback(err, res);
        })
    },
    getClient : (callback) => 
    {
        pool.connect((err, client, done) => 
        {
            const query = client.query.bind(client);

            // monkey patch the query method to keep track of the last query executed
            client.query = (...args) => {
                query.lastQuery = args;
                query(...args);
            }

            // set a timeout of 5 seconds.
            const timeout = setTimeout(() => 
            {
                console.error('A client has been checked out for more than 5 seconds!')
                console.error('The last executed query on this client was:' + query.lastQuery)
            }, 5000);
 
            const release = (err) => 
            {
                done(err);

                clearTimeout(timeout);

                client.query = query;
            }

            callback(err, client, release);
        })
    }
}