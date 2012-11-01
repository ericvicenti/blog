var _ = require('underscore'),
	fs = require('fs'),
	express= require('express'),
	auth = require('./auth.js'),
	settings = require("./settings.js"),
	db = require('./db.js'),
	moment = require('moment');

_.mixin({
	trunc: function(s, n){
		return s.substr(0,n-1)+(s.length>n?'&hellip;':'');
	},
	moment: moment
});

// Templating
var templateDir = __dirname + '/templates/',
	templateExt = '.html',
	templates = ['index','pages','login','profile','editPage'],
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
		content: render.login({
			action: req.param('action')
		})
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
		res.send(render.index({
			title: 'Your Profile',
			content: render.profile({
				user: user
			})
		}));
	});
});
app.get('/pages',  function(req, res){
	var page = Number(req.query.page);
	page = page ? page : 0;
	var page_size = 10;
	console.log(page);
	db.getPages(page_size, page*page_size,function(err, pages){
		console.log('heyss');
		res.send(render.index({
			title: 'Blog Pages',
			content: render.pages({
				page: page,
				page_size: page_size,
				pages: pages
			})
		}));
	});
});
app.get('/pages/new', function(req,res){
	res.send(render.index({
		title: 'edit page',
		content: render.editPage({
			page: {
				title: 'new page',
				body: 'no content yet'
			}
		})
	}));
});
app.post('/pages/new', function(req,res){
	console.log('posting new!!"!!')
	res.send();
});
app.get('/edit*', function(req,res){
	var path = req.url.split('/edit')[1];
	db.getPage(path, true, function(err, page){
		if(err){
			return res.redirect('/pages');
		}
		res.send(render.index({
			title: 'edit page',
			content: render.editPage({
				page: page
			})
		}));
	});
});
app.use(function(req,res,next){
	db.getPage(req.url, false, function(err, page){
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