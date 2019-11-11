const express = require('express');
const router = express.Router();
const tokenizer = require('./utils/Tokenizer');

//Controllers
const login = require('./controllers/auth/Login');
const register = require('./controllers/auth/Register');
const catchup = require('./controllers/Catchup');
const writer = require('./controllers/writer/Writer');
const writerStories = require('./controllers/writer/WriterStories'); 
const writerFibs = require('./controllers/writer/WriterFibs');
const writerFollowing = require('./controllers/writer/WriterFollowing');
const writerFollowers = require('./controllers/writer/WriterFollowers');
const intro = require('./controllers/Intro');
const genres = require('./controllers/Genres');
const trending = require('./controllers/Trending');
const feed = require('./controllers/Feed');
const writers = require('./controllers/Writers');
const tags = require('./controllers/Tags');
const search = require('./controllers/search/Search');
const newStory = require('./controllers/story/NewStory');
const story = require('./controllers/story/Story');
const read = require('./controllers/story/Read');
const upvoteStory = require('./controllers/story/UpvoteStory');
const downvoteStory = require('./controllers/story/DownvoteStory');
const newFib = require('./controllers/fib/NewFib');
const upvoteFib = require('./controllers/fib/UpvoteFib');
const downvoteFib = require('./controllers/fib/DownvoteFib');
const follow = require('./controllers/writer/Follow');
const unfollow = require('./controllers/writer/Unfollow');
const storyComments = require('./controllers/comments/StoryComments');
const postComment = require('./controllers/comments/PostComment');
const upvoteComment = require('./controllers/comments/UpvoteComment');
const downvoteComment = require('./controllers/comments/DownvoteComment');
const getSettings = require('./controllers/settings/GetSettings');
const saveSettings = require('./controllers/settings/SaveSettings');
const events = require('./controllers/events/Events');
const stories = require('./controllers/story/Stories');
const favourite = require('./controllers/story/Favourite');
const favourites = require('./controllers/writer/Favourites');
const continueReading = require('./controllers/writer/ContinueReading');
const logout = require('./controllers/writer/Logout');
const jumbotron = require('./controllers/Jumbotron');
const newDraft = require('./controllers/draft/NewDraft');
const drafts = require('./controllers/draft/Drafts');
const editStory = require('./controllers/story/EditStory');
const getStoryForEdit = require('./controllers/story/GetStoryForEdit');
const draft = require('./controllers/draft/Draft');
const editDraft = require('./controllers/draft/EditDraft');
const editFib = require('./controllers/fib/EditFib');

router.use(function timeLog (req, res, next) 
{
    console.log('Time: ', Date.now());
    next();
})

router.get("/", function(req, res)
{
    res.send("You are not supposed to be here....");
})

// Routes
router.post("/login", verifyFirebaseToken, login);
router.post("/register", verifyFirebaseToken, register);

router.get("/catchup", catchup);
router.get("/jumbotron", jumbotron);

router.get('/genres', lazyVerifyToken, genres);
router.get('/trending/:offset', lazyVerifyToken, trending);
router.get('/search/:type/:search/:offset', lazyVerifyToken, search);
router.get("/story/:story", lazyVerifyToken, story);
router.get("/story/read/:story", lazyVerifyToken, read);
router.get("/story/comments/:story/:replied_to", lazyVerifyToken, storyComments);
router.get("/story/comments/:story/", lazyVerifyToken, storyComments);
router.get("/writer/:username", lazyVerifyToken, writer);
router.get("/writer/stories/:username/:offset", lazyVerifyToken, writerStories);
router.get("/writer/fibs/:username/:offset", lazyVerifyToken, writerFibs);
router.get("/writer/following/:username/:offset", lazyVerifyToken, writerFollowing);
router.get("/writer/followers/:username/:offset", lazyVerifyToken, writerFollowers);
router.get("/writers", lazyVerifyToken, writers);
router.get("/tags/:offset", lazyVerifyToken, tags);
router.get("/stories/:type/:name/:offset", lazyVerifyToken, stories);

router.get("/intro/:username", verifyToken, intro);
router.get("/feed/:offset", verifyToken, feed);
router.get("/drafts/:offset", verifyToken, drafts);
router.post("/story", verifyToken, newStory);
router.post("/draft", verifyToken, newDraft);
router.get("/draft/:draft", verifyToken, draft);
router.post("/draft/:draft/edit", verifyToken, editDraft);
router.post("/story/upvote", verifyToken, upvoteStory);
router.post("/story/downvote", verifyToken, downvoteStory);
router.post("/story/:story/edit", verifyToken, editStory);
router.get("/story/:story/edit", verifyToken, getStoryForEdit);
router.post("/fib/upvote", verifyToken, upvoteFib);
router.post("/fib/downvote", verifyToken, downvoteFib);
router.post("/story/:storyUrl/fib/:fibId/edit", verifyToken, editFib);
router.post("/story/favourite", verifyToken, favourite);
router.post("/story/:story/fib", verifyToken, newFib);
router.post("/story/comment", verifyToken, postComment);
router.post("/:type/comment/upvote", verifyToken, upvoteComment);
router.post("/:type/comment/downvote", verifyToken, downvoteComment);
router.post("/writer/follow/:username", verifyToken, follow);
router.post("/writer/unfollow/:username", verifyToken, unfollow);
router.get("/settings", verifyToken, getSettings);
router.post("/settings/save", verifyToken, saveSettings);
router.get("/events/:offset", verifyToken, events);
router.get("/favourites/:offset", verifyToken, favourites);
router.get("/continue_reading/:offset", verifyToken, continueReading);
router.post("/logout", verifyToken, logout);

function verifyFirebaseToken(req, res, next)
{
    const token = tokenizer.getToken(req)

    if(token !== undefined)
    {
        req.token = token;
        next();
    }
    else
    {
        res.sendStatus(403);
    }
}

// authorize token.
function verifyToken(req, res, next)
{
    const token = req.cookies['gettone'];

    if(token !== undefined)
    {
        const uid = tokenizer.verify(token)

        if(uid !== undefined)
        {
            req.uid = uid
            next();
        }
        else
        {
            res.sendStatus(403)
        }
    }
    else
    {
        res.sendStatus(403)
    }
}

function lazyVerifyToken(req, res, next) {
    const token = req.cookies['gettone'];

    if(token !== undefined)
    {
        const uid = tokenizer.verify(token)

        if(uid !== undefined)
        {
            req.uid = uid
            next();
        }
        else
        {
            next();
        }
    }
    else
    {
        next();
    }
}

module.exports = router;