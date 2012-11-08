var _ = require('./util.js'),
	fs = require('fs'),
	express = require('express'),
	http = require('http'),
	https = require('https'),
	crypto = require('crypto'),
	auth = require('./auth.js'),
	settings = require("./settings.js"),
	db = require('./db.js');

// Templating
var templateDir = __dirname + '/templates/',
	templateExt = '.html',
	templates = ['index','page','pages','login','profile','editPage','home'],
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

function pagesListPage(req, res, next){
 	if(req.params.page == 'new') return next();
	var page_size = 10,
		page = Number(req.params.page);
	page = page ? page : 0;
	db.getPageList(page_size, page*page_size, function(err, pages){
		res.send(render.index({
			title: 'Blog Pages',
			content: render.pages({
				page: page,
				page_size: page_size,
				pages: pages
			})
		}));
	});
}
app.get('/pages', pagesListPage);
app.get('/pages/:page', pagesListPage);

app.get('/pages/new', function(req,res){
	res.send(render.index({
		title: 'edit page',
		content: render.editPage({
			page: {
				title: 'New Page',
				body: ''
			}
		})
	}));
});
app.post('/pages/new', function(req,res){
	var page = req.body;
	page.published = page.submit=="Publish";
	db.addPage(page.title, page.body, page.published, function(err, path){
		res.redirect((page.published ? '' : '/preview')+path);
	});
});
app.get('/edit*', function(req,res){
	var path = req.url.split('/edit')[1];
	db.getPage(path, true, false, function(err, page){
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
app.post('/edit*', function(req,res){
	var path = req.url.split('/edit')[1];
	var page = req.body;
	page.published = page.submit=="Publish";
	if(page.submit=="Delete Immediately"){
		return db.deletePage(path, function(){
			res.redirect('/pages');
		});
	}
	db.postVersion(path, page.title, page.body, page.published, function(){
		res.redirect((page.published ? "" : "/preview")+path);
	});
});

app.get('/preview*', function(req,res,next){
	var path = req.url.split('/preview')[1];
	db.getPage(path, true, function(err, page){
		if(page){ // Page
			res.send(render.index({
				title: page.title,
				content: render.page(page)
			}));
		} else next();
	});
});
var home = function(req, res, next){
	console.log(req.params.page);
	var page_size = 2,
		page = Number(req.params.page);
	page = page ? page : 0;
	console.log(page);
	if(req.params.page && (''+page !== req.params.page)){
		return next();
	}
	db.getPages(page_size+1, page*page_size, function(err, pages){
		var isAnother = pages.length == (page_size+1);
		if(isAnother) pages.pop();
		res.send(render.index({
			title: 'home',
			content: render.home({
				pages: pages,
				page: page,
				isAnother: isAnother
			})
		}));
	});
}
app.get('/:page', home);
app.get('/', home);

app.use(function(req,res,next){
	db.getPage(req.url, false, false, function(err, page){
		if(page){ // Page
			res.send(render.index({
				title: page.title,
				content: render.page(page)
			}));
		} else if(_.endsWith(req.url,'.versions')){
			next();
			// db.getPageVersions(_.trimStr(req.url,'.versions'), function(err, page){
			// 	res.send('dur');

			// })
		} else next();
	});
});
app.use(express.static(__dirname + '/client'));

app.use(function(req,res){
	res.send(404, render.index({
		title: 'Not found!',
		content: '<h2>We couldn&apos;t find what you are looking for</h2><p>Sorry, it&apos;s probably our fault</p><p>You may want to <a href="/login">sign in</a>.</p>'
	}))
});

var pfx = fs.readFileSync(settings.pfxPath).toString();

var httpsServer = false;
if(settings.securePort){
	var opts = {
		pfx: pfx,
		password: '',
		requestCert: true
	};

	httpsServer = https.createServer(opts, app);
	httpsServer.listen(settings.securePort);
}
var httpServer = http.createServer(app).listen(settings.port);
console.log("listening on port "+settings.port+( settings.securePort ? ' and '+settings.securePort:''));