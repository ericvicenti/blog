var _ = require('underscore'),
	fs = require('fs'),
	express= require('express'),
	auth = require('./auth.js'),
	settings = require("./settings.js"),
	db = require('./db.js');

// Templating
var templateDir = __dirname + '/templates/',
	templateExt = '.html',
	templates = ['index'],
	render = {};
_.each(templates, function(name){
	render[name] = _.template(String(fs.readFileSync(templateDir + name + templateExt)));
});

// Main app
var app = express();
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
	secret: "asdfljkal jksrg23asjdflk"
}));
app.get('/login', function(req, res){
	res.send(render.index({
		title: 'Login',
		content: '<a class="btn" href="/login/google?action='+((req.param('action') && req.param('action') != "") ? req.param('action') : "/pages")+'">Login with Google</a>'
	}));
});
app.get('/login/google', function(req, res) {	
	auth.googleLogin(req, res);
});
app.get('/login/google/cb', function(req, res) {
	auth.googleLoginCallback(req, res);
});
app.get('/profile', auth.requireGoogleAuth, function(req, res) {
	auth.getGoogleProfile(req, res, function(user){
		res.send('your id is '+user.id);
	});
});
app.get('/pages', auth.requireAuth, function(req, res){
	db.getPages(10,0,function(err, pages){
		console.log('heyss');
		console.log(pages);
		res.send(JSON.stringify(pages));
	});
});
app.use(function(req,res,next){
	db.getPage(req.url, function(err, page){
		if(page){ // Page
			res.send(render.index({
				title: page.title,
				content: page.body
			}));
		} else next();
	});
});
app.listen(settings.port);
console.log("listening on port "+settings.port);