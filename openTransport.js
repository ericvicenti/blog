
var _ = require("./util");
var fs = require("fs");
var https = require("https");
var settings = require("./settings.js");
var db = require('./db.js');


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

var errors = {
  _400_01 : { message: 'Must use HTTPS' },
  _400_02 : { message: 'SSL Error' },
  _400_03 : { message: 'SSL Trust Error' },
  _400_04 : { message: 'Identity Error' },
  _400_05 : { message: 'Invalid Method' },
  _400_20 : { message: 'Cannot parse body' },
  _400_21 : { message: 'Unacceptable Link' },
  _400_22 : { message: 'Unacceptable opinion' },
  _400_23 : { message: 'Unacceptable subscription' },
  _400_24 : { message: 'Invalid target' },
  _401_00 : { message: 'Not Authorized' },
  _404_00 : { message: 'Page not found' },
  _500_00 : { message: 'Server Error' },
  _500_01 : { message: 'Database Error' }
}

function parseErrorId(e){
  var parts = e.split('_');
  var bigCode = parts[1];
  var littleCode = parts[2];
  return {
    code: bigCode + '.' + littleCode,
    statusCode: Number(bigCode)
  }
}

function getError(code){
  var errorId = '_' + code;
  var error = errors[errorId];
  return _.extend(parseErrorId(errorId), error);
}

module.exports = function(req, res, next){
  function sendError(errorCode){
    var e = getError(errorCode);
    res.send(e.statusCode, {
      message: e.message,
      code: e.code
    });
  }
  function sendBody(body){
    res.send(200, body);
  }
  _.log('req.headers.OpenBookVersion: ', req.headers.OpenBookVersion);
  if(req.headers.OpenBookVersion){
    if(req.method == 'POST') {
      _.log('GOT A POST');
      _.log(req.body);
      sendBody({ whats: 'up?' });
    } else if(req.method == 'GET') {
      db.getPage(req.url, false, false, function(err, page){
        if(err) return sendError('404_00');
        sendBody(page);
      });
    } else return sendError('400_05');
  } else next();
}