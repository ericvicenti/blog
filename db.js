var settings = require("./settings.js"),
	_ = require("./util.js"),
	moment = require("moment"),
	sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(__dirname+'/data');

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
	db.all("SELECT path, title, updated, published, body FROM pages WHERE published IS NOT NULL ORDER BY published DESC LIMIT $limit OFFSET $offset", {
		"$limit": limit,
		"$offset": offset
	}, function(err, rows) {
	  callback(err, rows);
	});
}

function isPathUsed(path, callback){
	db.get("SELECT COUNT(*) FROM pages WHERE path=?", [path], function(err, response){
		var count = response["COUNT(*)"];
		callback(count>0);
	});
}

function viewPage(path, callback){
	// get the public version of a page from a path, which could include a version
	console.log("page view");
	console.log(path);
	// the main row on the page needs to have published set in order to serve any version of the page
	db.get("SELECT * FROM pages WHERE path=? AND published>0", [path], function(err, row) {
		if(row) row.newVersion = row.version;
		if(err || row==null){
			var v = _.parseVersion(path);
			if(v){
				db.get("SELECT * FROM pages WHERE path=? published>0", [v.path], function(er, r) {
					if(r) r.newVersion = r.version;
					if(r && v.version == r.version) callback(er, r);
					if(r && !er) getPageVersion(r, v.version, function(err, page){
						// viewPage only returns published versions
						if(!err && page && !page.published) callback('NotFound', null);
						callback(err, page);
					else callback(err, row)
				});
			} else {
				callback(err, row);
			}
		} else if(callback){
			callback('NotFound');
		}
	});
}

function previewPage(path, callback){
	var limit = "";
	if(!includeUnpublished) limit = " AND published>0";
	console.log(arguments);
	db.get("SELECT * FROM pages WHERE path=?"+limit, [path], function(err, row) {
		if(row) row.newVersion = row.version;
		if(err || row==null){
			var v = _.parseVersion(path);
			if(v){
				db.get("SELECT * FROM pages WHERE path=?"+limit, [v.path], function(er, r) {
					if(r) r.newVersion = r.version;
					if(r && v.version == r.version) callback(er, r);
					if(r && !er) getPageVersion(r, v.version, callback);
					else callback(err, row)
				});
			} else {
				callback(err, row);
			}
		} else if(callback){
			if(includeDraft){
				db.all("SELECT * FROM history WHERE path=? ORDER BY version ASC", [
						path
					], function(err, versions){
						_.each(versions, function(v){
							if(v.version>row.version){
								row.body = _.compilePatch(row.body, v.patch);
								row.title = v.title;
								row.time = v.time;
								row.version = v.version;
							}
						});
						if(!includeUnpublished){
							versions = _.filter(versions, function(v){ return v.published });
						}
						row.versions = versions;
						callback(err, row);
					});
			} else callback(err, row);
		}
	});
}

function getPageVersion(page, version, callback){
	if(page.version == version){
		if(callback) callback(null, page);
		return;
	}
	console.log('getting page version')
	console.log(arguments);
	var minVersion, maxVersion, order;
	if(version > page.version){
		minVersion = page.version;
		maxVersion = version;
		order = "ASC";
	} else {
		minVersion = version;
		maxVersion = page.version;
		order = "DESC";
	}
	db.all("SELECT title, version, patch, time, published FROM history WHERE page=? AND version>=? AND version<=? ORDER BY version "+order, [page.path, minVersion, maxVersion], function(err, rows){
		console.log(rows)
		if(err)	callback(err, page);
		var v = false;
		_.each(rows,function(row){
			if(row.version==version){ v=row; };
			page.body = _.compilePatch(page.body, row.patch);
		});
		if(!v) {
			console.log('yeck')
			callback('VersionNotFound', null);
			return;
		}
		page.title = v.title;
		page.time = v.time;
		page.newVersion = page.version;
		page.version = version;
		console.log(page);
		console.log(err);
		callback(err, page);
	});
}

function addPage(title, body, published, callback, iter){
	iter = iter ? iter : 0;
	var path = '/'+_.slugify(title);
	if(iter > 0) path += iter;
	console.log('adding..');
	console.log(arguments)
	db.run("INSERT INTO pages (path, title, body, updated, published) VALUES (?, ?, ?, ?, ?)", [path, title, body, moment().unix(), published ? moment().unix() : null], function(err){
		if(err && err.code=='SQLITE_CONSTRAINT'){
			return addPage(title, body, published, callback, iter+1);
		}
		callback(err, path);
	});
}

function postVersion(path, title, body, published, callback){
	console.log('saving the version!!!');
	console.log(arguments)
	getPage(path, true, false, function(err, page){
		db.get("SELECT version FROM history ORDER BY version DESC LIMIT 1", function(err, v){
		var version = ((v && (v.version>page.version)) ? v.version : page.version ) + 1,
			patch = _.createPatch(body, page.body);
		console.log("VERSION IS "+version);
		published = published ? (page.published ? page.published : moment().unix()) : null;
		function addToHistory(version){
			db.run("INSERT OR REPLACE INTO history (time, title, patch, page, version, published) VALUES (?, ?, ?, ?, ?, ?, ?)", [
				page.updated,
				page.title,
				patch.patch,
				path,
				version,
				published ? moment().unix() : false
			], function(err){
				callback(err);
			});
		}
		if(page.published){
			if(published){
				db.run("UPDATE pages SET title=?, body=?, updated=?, version=? WHERE path=?", [
					title,
					body,
					moment().unix(),
					version,
					path
				],function(er){
					addToHistory(version - 1);
				});
			} else {
				db.run("UPDATE pages SET draft=?, WHERE path=?", [
					1,
					path
				],function(er){
					addToHistory(version);
				});
			}
		} else {
			db.run("UPDATE pages SET title=?, body=?, updated=?, published=?, version=? WHERE path=?", [
				title,
				body,
				moment().unix(),
				published,
				version,
				path
			],function(er){
				addToHistory(version - 1);
			});	
		}
		});
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

db.run("\
CREATE TABLE pages \
(\
	path TEXT PRIMARY KEY,\
	title TEXT NOT NULL,\
	body TEXT NOT NULL,\
	updated INT NOT NULL,\
	published INT,\
	version INTEGER NOT NULL DEFAULT 0\
);", function(err){ // we don't care about err, cause there is probably already a table
db.run("\
CREATE TABLE feedback\
(\
 	id INTEGER PRIMARY KEY,\
	host TEXT,\
	page TEXT,\
	vote INTEGER,\
	target TEXT,\
	FOREIGN KEY(page) REFERENCES pages(path)\
);", function(err){ // we don't care about err, cause there is probably already a table
  db.run("\
CREATE TABLE history\
(\
 	id INTEGER PRIMARY KEY,\
	time INT NOT NULL,\
	title TEXT NOT NULL,\
	published INT,\
	patch TEXT,\
	page TEXT NOT NULL,\
	version INTEGER NOT NULL DEFAULT 0,\
	FOREIGN KEY(page) REFERENCES pages(path) ON DELETE CASCADE\
);", function(err){ // we don't care about err, cause there is probably already a table
	  db.run("\
	CREATE UNIQUE INDEX IF NOT EXISTS version ON history\
(\
	page,\
	version,\
);", function(err){ // we don't care about err, cause there is probably already a table
	  	console.log('started!');
	  });
  });
 });
});

module.exports = {
	isPathUsed: isPathUsed,
	getPages: getPages,
	getPageList: getPageList,
	viewPage: viewPage,
	previewPage: previewPage,
	setFeedback: setFeedback,
	postVersion: postVersion,
	addPage: addPage,
	deletePage: deletePage
}