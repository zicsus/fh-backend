module.exports = function()
{
    var self = {};

    self.extend = function(msg, extend) 
    { 
        return msg + " - " + extend;
    };

    self.files = {
        upload_failed : {
            console: (extend) => {
                return self.extend("Unable to upload files", extend);
            },
            code: 700
        }
    }

    self.story = {
        story_not_found: {
            console: (extend) =>
            {
                return self.extend("Story not found", extend);
            },
            code: 600
        },
        comment_not_found: {
            console: (extend) => {
                return self.extend("Comment not found", extend);
            },
            code: 601
        },
        fib_not_found: {
            console: (extend) => {
                return self.extend("Fib not found", extend);
            },
            code: 602
        },
        not_last_fib: {
            console: (extend) => {
                return self.extend("Prev fib is not the last fib", extend);
            },
            code: 603
        },
        genre_not_found: {
            console: (extend) => {
                return self.extend('Genre not found', extend);
            },
            code: 604
        },
        tag_not_found: {
            console: (extend) => {
                return self.extend('Tag not found', extend);
            },
            code: 605
        },
        draft_not_found: {
            console: (extend) => 
            {
                return self.extend('Draft not found', extend);
            },
            code: 606
        }
    } 

    self.auth = {
        user_already_exists: {
            console: function(extend)
            {
                return self.extend("User already exists", extend);
            },
            code: 500 
        },
        username_in_use: {
            console: function(extend)
            {
                return self.extend("Username already in use", extend);
            },
            code: 501
        },
        user_not_exists: {
            console: function(extend)
            {
                return self.extend("User not found", extend);
            },
            code: 502
        },
        invalid_token: {
            console: (extend) => {
                return self.extend("Invalid auth token", extend);
            },
            code: 503
        },
        not_elite: {
            console: (extend) => {
                return self.extend("Not a elite user", extend);
            },
            code: 504
        }
    }

    self.db = {
        query: {
            console: function(extend)
            {
                return self.extend("Unable to query", extend);
            },
            code : 2000
        },
        connect: {
            console: function(extend)
            {
                return self.extend("Unable to connect to db", extend);
            },
            code: 2001
        },
        client : {
            console: function(extend)
            {
                return self.extend("Unable to retrieve client", extend);
            },
            code : 2002
        },
        transaction : {
            console: function(extend)
            {
                return self.extend("Transaction failed", extend);
            },
            code: 2003
        }
    }

    self.inputs = {
        name : {
            console : function(extend)
            {
                return self.extend("Name validation failed", extend);
            },
            code : 1
        },
        username : {
            console : function(extend)
            {
                return self.extend("Username validation failed", extend);
            },
            code : 2  
        },
        email : {
            console : function(extend)
            {
                return self.extend("Email validation failed", extend);
            },
            code : 3 
        },
        phone : {
            console : function(extend)
            {
                return self.extend("Phone validation failed", extend);
            },
            code : 4  
        },
        medium : {
            console : function(extend)
            {
                return self.extend("Medium validation failed", extend);
            },
            code : 5 
        },
        title : {
            console : (extend) =>
            {
                return self.extend("title validation failed", extend);
            },
            code: 6
        },
        description : {
            console : (extend) =>
            {
                return self.extend("description validation failed", extend);
            },
            code: 7
        },
        tag: {
            console: (extend) => 
            {
                return self.extend("Tag validation failed", extend);
            },
            code: 8
        },
        genre: {
            console: (extend) => 
            {
                return self.extend("genre validation failed", extend);
            },
            code: 9
        },
        story_id: {
            console: (extend) => {
                return self.extend("Story id validation failed", extend);
            },
            code: 10
        },
        comment_reply: {
            console: (extend) => {
                return self.extend("Reply validation failed", extend);
            },
            code: 11
        },
        comment_message: {
            console: (extend) => {
                return self.extend("Comment message validation failed", extend);
            },
            code: 12
        },
        comment_id: {
            console: (extend) => {
                return self.extend("Comment id validation failed", extend);
            },
            code: 13
        },
        type: { 
            console: (extend) => {
                return self.extend("Type validation failed", extend);
            },
            code: 14
        },
        page: {
            console: (extend) => {
                return self.extend("Page validation failed", extend);
            },
            code: 15
        },
        page_not_found: {
            console: (extend) => {
                return self.extend("Page not found in the story", extend);
            },
            code: 16
        },
        prev_fib: {
            console: (extend) => {
                return self.extend("Prev fib validation failed", extend);
            },
            code: 17
        },
        fib: {
            console: (extend) => {
                return self.extend("Fib validation failed", extend);
            },
            code: 18
        },
        fibId: {
            console: (extend) => {
                return self.extend("Fib id validation failed", extend);
            },
            code: 19
        },
        offset: {
            console: (extend) => {
                return self.extend("Offset validation failed", extend);
            },
            code: 20
        },
        file: {
            console: (extend) => {
                return self.extend("File validation failed", extend);
            },
            code: 21
        },
        bio: {
            console: (extend) => {
                return self.extend("Bio validation failed", extend);
            },
            code: 22
        },
        social: {
            console: (extend) => {
                return self.extend("Social validation failed", extend);
            },
            code: 23
        },
        status: {
            console: (extend) => 
            {
                return self.extend("Status validation failed", extend);
            },
            code: 24
        },
        draft: {
            console: (extend) => 
            {
                return self.extend("Draft id validation failed", extend);
            },
            code: 25
        },
        selfVote: {
            console: (extend) => 
            {
                return self.extend("Self votings", extend);
            },
            code: 26
        },
        private: {
            console: (extend) => 
            {
                return self.extend("private validation failed", extend);
            },
            code: 27
        }
    };

    self.firebase = {
        token : {
            console: function(extend)
            {
                return self.extend("Unable to verify firebase token", extend);
            },
            code : 1000
        },
    }

    return self;
}