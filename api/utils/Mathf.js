
const validator = require('./Validator')

module.exports = {
    randomString: (length) => {
        var string = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

        for (var i = 0; i < length; i++)
            string += possible.charAt(Math.floor(Math.random() * possible.length));

        return string;
    },

    signUrl: (key) => {
    	if(key.trim() == "" || key.startsWith('https://'))
    		return key;

    	return 'https://cdn.fibhubapp.com/' + key;
    },

    generateStoryUrl: (title, id) => 
    {
        const url = title.replace(/[^&-a-z0-9- ]/gi,'').replace(/\ /g, '-') + "-" + id;
        return url;
    },

    generateUsername : (email) => 
    {
        let username = email.split("@")[0];

        if(!validator.isMention("@"+username))
        {
            username = username.replace(/[^\w_.]/gi, '');
            
            if(!validator.isMention("@"+username))
            {
                var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.";
                username = "";
                for (var i = 0; i < 6; i++)
                    username += possible.charAt(Math.floor(Math.random() * possible.length));
            }
        }

        if(username.length >= 20)
        {
            username = username.substring(0, 18);
        }

        return username;
    }
}