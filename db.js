var settings = require("./settings.js"),
	_ = require("underscore"),
	sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

function getTimestamp(){
	return Math.floor((+(new Date))/1000);
}

function getPages(limit, offset, callback){
	limit = limit ? limit : settings.defaultRowLimit;
	limit = (settings.maxRowLimit<limit) ? settings.maxRowLimit : limit;
	offset = offset ? Number(offset) : 0;
	db.all("SELECT * FROM pages LIMIT $limit OFFSET $offset", {
		"$limit": limit,
		"$offset": offset
	}, function(err, rows) {
	  callback(err, rows);
	});
}

function getPage(path, callback){
	db.get("SELECT * FROM pages WHERE path=$path", {
		"$path": path
	}, function(err, row) {
	  callback(err, row);
	});
}

function addPage(path, title, body, callback){
	db.run("INSERT INTO pages (path, title, body, time) VALUES (?, ?, ?, ?)", [path, title, body, getTimestamp()], function(err){
		callback(err);
	});
}

function deletePage(page, callback){
	db.run("DELETE FROM pages WHERE path=?", page, function(err){
		callback(err);
	});
}

function setFeedback(page, host, vote, target, callback){
	db.run("INSERT OR REPLACE INTO feedback (page, host, vote, target) VALUES (?, ?, ?, ?) ", [page, host, vote, target], function(err){
		callback(err);
	});
}

db.serialize(function() {
  db.run("\
CREATE TABLE pages \
(\
	path TEXT PRIMARY KEY,\
	title TEXT NOT NULL,\
	body TEXT NOT NULL,\
	time INT NOT NULL\
);");
  db.run("\
CREATE TABLE feedback\
(\
 	id INTEGER PRIMARY KEY,\
	host TEXT,\
	page TEXT,\
	vote INTEGER,\
	target TEXT,\
	FOREIGN KEY(page) REFERENCES pages(path)\
);");

  var stmt = db.prepare("INSERT INTO pages (path, title, body, time) VALUES (?, ?, ?, ?)");
  _.each(['/','/asddf','/durka', '/dasdf/dasdf', '/shasfsdf/dsf'],function(i){
    stmt.run(i,"tizitle::" + i + "-endtitle", "this iz a body omg", 1412);
  });
  stmt.finalize();
  getPages(2, 0, function(err, r){ console.log(r); });
  getPage("/", function(err, r){ console.log(r); });
  setFeedback('/', 'asdf.asdf.com', 1, 'asdf', function(err){
	if(!err) console.log('feedback set!')
	else console.log(err);
  });
});
module.exports = {
	getPages: getPages,
	getPage: getPage,
	setFeedback: setFeedback,
	addPage: addPage,
	deletePage: deletePage
}