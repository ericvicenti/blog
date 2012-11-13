var _ = require('./util.js'),
	fs = require('fs'),
	express = require('express'),
	http = require('http'),
	https = require('https'),
	crypto = require('crypto'),
	auth = require('./auth.js'),
	settings = require("./settings.js"),
	db = require('./db.js');

var reservedPathFirstTerms = ['login','pages','edit','preview']; //TODO: check this.

// Templating
var templateDir = __dirname + '/templates/',
	templateExt = '.html',
	templates = ['index','page','pages','login','profile','editPage','home'],
	render = {};
_.each(templates, function(name){
	render[name] = _.template(String(fs.readFileSync(templateDir + name + templateExt)));
});
var renderIndex = render.index;
render.index = function(a){ return renderIndex(_.extend({
	name: settings.name
}, a)); };

// Main app
var app = express();
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
	secret: "asdfljkal jksrg23asjdflk"
}));

// Stop here if they are requesting the wrong host
app.use(function(req, res, next){
	if((settings.host+(settings.displayPort ? ':'+settings.displayPort : '')) == req.headers.host){
		next();
	} else {
		res.send('');
	}
});

// HTTPS Client
var pfxPath = settings.pfx
settings.pfx = fs.readFileSync(pfxPath);
var agent = new https.Agent({
	requestCert: true,
	pfx: settings.pfx,
	password: settings.pfxPassword
});
function sendRequest(opts,cb){
	var opts = _.extend({
		agent: agent,
		port: 443
	}, opts);
	var req = new https.request(opts, function(res){
		res.body = '';
		res.on('data', function(a){
			res.body += a;
		});
		res.on('end', function(){
			cb(res);
		});
	});
	req.end();
	return req;
}

var get = function(host, path, callback){
	sendRequest({
		host: host,
		path: path,
		method: 'GET'
	}, callback);
}

var post = function(host, path, opts, callback){
	var data = {
		subject: opts.subject,
		opinion: opts.opinion,
		response: opts.response,
		modification: opts.modification
	}
	sendRequest({
		host: host,
		path: path,
		method: 'GET'
	}, callback);
}

app.get('/login', function(req, res){
	res.send(render.index({
		title: 'Login',
		content: render.login({
			action: req.param('action')
		}),
		locals: res.locals || {}
	}));
});
app.get('/logout', function(req, res){
	auth.logout(req, res, function(){
		res.redirect('/');
	});
});
app.get('/login/google', function(req, res) {	
	auth.googleLogin(req, res);
});
app.get('/login/google/cb', function(req, res) {
	auth.googleLoginCallback(req, res);
});
app.get('/profile', auth.requireAuth, function(req, res) {
	res.send(render.index({
		title: 'Your Profile',
		content: render.profile({
			user: res.locals.user
		}),
		locals: res.locals || {}
	}));
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
			}),
			locals: res.locals || {}
		}));
	});
}
app.get('/pages', auth.requireAuth, pagesListPage);
app.get('/pages/:page', auth.requireAuth, pagesListPage);

app.get('/pages/new', auth.requireAuth, function(req,res){
	res.send(render.index({
		title: 'edit page',
		content: render.editPage({
			page: {
				title: 'New Page',
				body: ''
			}
		}),
		locals: res.locals || {}
	}));
});
app.post('/pages/new', auth.requireVerifiedAuth, function(req,res){
	var page = req.body;
	page.published = page.submit=="Publish";
	db.addPage(page.title, page.body, page.published, function(err, path){
		res.redirect((page.published ? '' : '/preview')+path);
	});
});
app.get('/edit*', auth.requireAuth, function(req,res){
	var path = req.url.split('/edit')[1];
	db.getPage(path, true, false, function(err, page){
		if(err){
			return res.redirect('/pages');
		}
		res.send(render.index({
			title: 'edit page',
			content: render.editPage({
				page: page
			}),
			locals: res.locals || {}
		}));
	});
});
app.post('/edit*', auth.requireVerifiedAuth, function(req,res){
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

app.get('/preview*', auth.requireAuth, function(req,res,next){
	var path = req.url.split('/preview')[1];
	db.getPage(path, true, function(err, page){
		if(page){ // Page
			res.send(render.index({
				title: page.title,
				content: render.page(page),
				locals: res.locals || {}
			}));
		} else next();
	});
});
var home = function(req, res, next){
	var page_size = 2,
		page = Number(req.params.page);
	page = page ? page : 0;
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
			}),
			locals: res.locals || {}
		}));
	});
}
app.get('/:page', auth.startAuth, home);
app.get('/', auth.startAuth, home);

app.use(function(req,res,next){
	db.getPage(req.url, false, false, function(err, page){
		if(page){ // Page
			auth.startAuth(req, res, function(){
				res.send(render.index({
					title: page.title,
					content: render.page(page),
					locals: res.locals || {}
				}));
			})
		} else next();
	});
});


app.use(function(req,res,next){
	return next();
var parts = req.url.split('/');
	if(parts.length<3) return next();
	parts.shift();
	sendRequest({
		host: parts.shift(),
		method: 'GET',
		path: '/'+parts.join('/')
	},function(req){
		if(req.connection.authorized){
			console.log(req);
			res.send();
		} else next();
	});
});

app.use(express.static(__dirname + '/client'));

app.use(function(req,res){
	res.send(404, render.index({
		title: 'Not found!',
		content: '<h2>We couldn&apos;t find what you are looking for</h2><p>Sorry, it&apos;s probably our fault</p><p>You may want to <a href="/login">sign in</a>.</p>',
		locals: res.locals || {}
	}))
});
var hostKeys = {};
_.each(settings.hosts, function(host){
	hostKeys[host.name] = { pfx: fs.readFileSync(host.pfx), password: host.password };
});
var httpsServer = false;
if(settings.securePort){
	var opts = {
		pfx: settings.pfx,
		password: settings.pfxPassword,
		requestCert: true,
		SNICallback: function(host){
			var host = hostKeys[host];
			if(!host) return;
			return crypto.createCredentials({
				pfx: host.pfx,
				password: host.password
			}).context;
		}
	};

	httpsServer = https.createServer(opts, app);
	httpsServer.listen(settings.securePort);
}
var httpServer = http.createServer(app).listen(settings.listenPort);
console.log("listening on port "+settings.listenPort+( settings.securePort ? ' and '+settings.securePort:''));
