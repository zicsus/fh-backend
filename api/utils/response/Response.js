const tokenizer = require('../Tokenizer');

module.exports = function(res, uid, controller)
{
    this.uid = uid;
    this.res = res;
    this.controller = controller;

    this.ok = (message) =>
    {
        if(this.uid != "" && this.uid != undefined)
        {
            let user = {
                ipseity: this.uid
            }
            const token = tokenizer.generate(user);
            if(token != undefined)
            {
                this.res.cookie('gettone', token, {maxAge: 1000 * 60 * 60 * 24 * 15, httpOnly: true});
            }
        }
        return this.res.json({status:'OK', message:message});
    }

    this.error = (error, err) =>
    {
        console.log(error.console(this.controller), err);
        return this.res.json({status:'ERROR', message: error.code});
    }

    this.logout = () => 
    {
        this.res.clearCookie('gettone');
        this.res.json({status:'OK', message:''});
    }

    this.setUid = (uid) => 
    {
        this.uid = uid;
    }
}