const jwt = require('jsonwebtoken');
const fs = require("fs")

module.exports = {
    generate : function(payload)
    {
        let options = { 
            subject: 'authorization',
            algorithm: 'RS256',
            expiresIn: '15d',
            issuer: 'issuer'
        }
        let privateKey = fs.readFileSync("./api/secret/private.key", "utf-8");
        try
        {
            const token = jwt.sign(payload, privateKey, options)
            return token
        }
        catch(err)
        {
            return undefined
        }
    },
    verify : function(token)
    {
        let verifyOption = {
            subject: 'authorization',
            algorithms: ['RS256'],
            maxAge: '15d',
            issuer: 'issuer'
        }

        let publicKey = fs.readFileSync("./api/secret/public.key", "utf-8")

        try
        {
            const verified = jwt.verify(token, publicKey, verifyOption)
            const ipseity = verified.ipseity

            return ipseity
        }
        catch(err)
        {
            return undefined
        }
    },
    getToken: function(req)
    {
        const bearerHeader = req.headers.authorization;
        if(typeof bearerHeader !== 'undefined')
        {
            const bearer = bearerHeader.split(' ')
            
            if(bearer.length == 2 && bearer[0] == "bearer")
            {
                const bearerToken = bearer[1]
                return bearerToken
            }
            else
            {
                return undefined
            }            
        }
        else
        {
            return undefined
        }
    }

}