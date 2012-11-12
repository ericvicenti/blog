var OAuth = require('oauth').OAuth,
	querystring = require('querystring'),
	settings = require('./settings.js');

var googleLogin = function(req, res){
	var scopes = [ querystring.escape("https://www.googleapis.com/auth/userinfo.profile") ];
	var oa = new OAuth("https://www.google.com/accounts/OAuthGetRequestToken?scope="+scopes.join('+'),
						"https://www.google.com/accounts/OAuthGetAccessToken",
						"anonymous",
						"anonymous",
						"1.0",
						"http"+(settings.displaySecure ? 's':'')+"://"+settings.host+(settings.displayPort ? ":"+settings.displayPort : '' )+"/login/google/cb"+( req.param('action') && req.param('action') != "" ? "?action="+querystring.escape(req.param('action')) : "" ),
						"HMAC-SHA1");
	oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
		if(error) {
			console.log('error');
			console.log(error);
		} else {
			req.session.oa = oa;
			req.session.oauth_token = oauth_token;
			req.session.oauth_token_secret = oauth_token_secret;
			res.redirect("https://www.google.com/accounts/OAuthAuthorizeToken?oauth_token="+oauth_token);
		}
	});
}

var getGoogleProfile = function(req, res, callback){
	res.oa.getProtectedResource("https://www.googleapis.com/oauth2/v2/userinfo", "GET", 
		req.session.oauth_access_token, 
		req.session.oauth_access_token_secret,
		function (error, data, response) {
			var user = JSON.parse(data);
			callback(user);
		});
}

var googleLoginCallback = function(req, res){
	var oa = new OAuth(req.session.oa._requestUrl,
					req.session.oa._accessUrl,
					req.session.oa._consumerKey,
					req.session.oa._consumerSecret,
					req.session.oa._version,
					req.session.oa._authorize_callback,
					req.session.oa._signatureMethod);
	oa.getOAuthAccessToken(
		req.session.oauth_token, 
		req.session.oauth_token_secret, 
		req.param('oauth_verifier'), 
		function(error, oauth_access_token, oauth_access_token_secret, results2) {
			if(error) {
				console.log('error');
				console.log(error);
				res.redirect('/login');
	 		}
	 		else {
				req.session.oauth_access_token = oauth_access_token;
				req.session.oauth_access_token_secret = oauth_access_token_secret;
				res.redirect((req.param('action') && req.param('action') != "") ? req.param('action') : "/manage");
			}
	});
}

var requireGoogleAuth = function(req, res, next) {
	if(!req.session.oauth_access_token)
		return res.redirect("/login?action="+querystring.escape(req.originalUrl));
	res.oa = new OAuth(req.session.oa._requestUrl,
						req.session.oa._accessUrl,
						req.session.oa._consumerKey,
						req.session.oa._consumerSecret,
						req.session.oa._version,
						req.session.oa._authorize_callback,
						req.session.oa._signatureMethod);
	next();
};

var requireAuth = function(req, res, next) {
	requireGoogleAuth(req, res, function(){
		getGoogleProfile(req, res, function(user){
			if(user.id==settings.googleID) next();
			else res.redirect("/profile");
		});
	});
}

module.exports = {};
module.exports.googleLogin = googleLogin;
module.exports.googleLoginCallback = googleLoginCallback;
module.exports.requireGoogleAuth = requireGoogleAuth;
module.exports.requireAuth = requireAuth;
module.exports.getGoogleProfile = getGoogleProfile;