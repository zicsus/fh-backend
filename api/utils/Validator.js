const validator = require('validator');
const mediums = require('./Mediums');

module.exports = {

    isEmail : function(string)
    {
        return validator.isEmail(string);
    },
    isAlpha : function(string)
    {
        return validator.isAlpha(string);
    },
    isNum : function(string) {
        return validator.isInt(string);
    },
    isPhone : function(string)
    {
        return validator.isPhone(string);
    },
    isTag: function(string)
    {
        return /([#][\w_]+$)/.test(string);
    },
    isMention: function(string)
    {
        return /([@][\w_.]+$)/.test(string);
    },
    isMedium: function(string)
    {
        let flag = false;
        for(i in mediums)
        {
            if(string === mediums[i])
            {
                flag = true;
                break;
            }
        }
        return flag;
    },
    isUrl: function(string) {
        const options = {
            protocols: ['http', 'https'],
            allow_underscores: true
        };
        return validator.isURL(string, options);
    }
}