var settings = require("./settings.js"),
	_ = require("./util.js"),
	moment = require("moment"),
	sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

function getPageList(limit, offset, callback){
	limit = limit ? limit : settings.defaultRowLimit;
	limit = (settings.maxRowLimit<limit) ? settings.maxRowLimit : limit;
	offset = offset ? Number(offset) : 0;
	db.all("SELECT path, title, updated, published FROM pages LIMIT $limit OFFSET $offset", {
		"$limit": limit,
		"$offset": offset
	}, function(err, rows) {
	  callback(err, rows);
	});
}

function getPages(limit, offset, callback){
	limit = limit ? limit : settings.defaultRowLimit;
	limit = (settings.maxRowLimit<limit) ? settings.maxRowLimit : limit;
	offset = offset ? Number(offset) : 0;
	db.all("SELECT path, title, updated, published FROM pages ASC WHERE published IS NOT NULL ORDER BY published LIMIT $limit OFFSET $offset", {
		"$limit": limit,
		"$offset": offset
	}, function(err, rows) {
	  callback(err, rows);
	});
}

function setPagePublished(page, published, callback){
	published = (published == true);
	published = published ? moment().unix() : null;
	db.run("UPDATE pages SET published=? WHERE path=?", [published, page], function(err){
		callback(err);
	});
}

function isPathUsed(path, callback){
	db.get("SELECT COUNT(*) FROM pages WHERE path=?", [path], function(err, response){
		var count = response["COUNT(*)"];
		callback(count>0);
	});
}

function getPage(path, includeUnpublished, callback){
	var limit = "";
	if(!includeUnpublished) limit = " AND published>0";
	db.get("SELECT * FROM pages WHERE path=$path"+limit, {
		"$path": path
	}, function(err, row) {
	  if(callback) callback(err, row);
	});
}

function addPage(title, body, published, callback, iter){
	iter = iter ? iter : 0;
	var path = '/'+_.slugify(title);
	if(iter > 0) path += iter;
	db.run("INSERT INTO pages (path, title, body, updated, published) VALUES (?, ?, ?, ?, ?)", [path, title, body, moment().unix(), published ? moment().unix() : null], function(err){
		if(err && err.code=='SQLITE_CONSTRAINT'){
			return addPage(title, body, published, callback, iter+1);
		}
		callback(err, path);
	});
}

function editPage(path, title, body, published, callback){
	published = published ? moment().unix() : null;
	db.run("UPDATE pages SET title=?, body=?, updated=?, published=? WHERE path=?", [title, body, moment().unix(), published, path], function(err){
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
	updated INT NOT NULL,\
	published INT DEFAULT NULL\
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

  var stmt = db.prepare("INSERT INTO pages (path, title, body, updated) VALUES (?, ?, ?, ?)");
  _.each(['/','/asddf','/durka', '/dasdf/dasdf', '/shasfsdf/dsf'],function(i){
    stmt.run(i,"tizitle::" + i + "-endtitle", "this iz a body omg", moment().unix());
  });
  stmt.finalize();
  getPage("/", function(err, r){ console.log(r); });
  setFeedback('/', 'asdf.asdf.com', 1, 'asdf', function(err){
	if(!err) console.log('feedback set!')
	else console.log(err);
  });
});
module.exports = {
	isPathUsed: isPathUsed,
	getPages: getPages,
	getPageList: getPageList,
	getPage: getPage,
	setFeedback: setFeedback,
	editPage: editPage,
	addPage: addPage,
	deletePage: deletePage,
	setPagePublished: setPagePublished
}