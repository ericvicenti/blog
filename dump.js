var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(__dirname+'/data');

db.all("select * from pages", function(err,all){
	console.log('PAGES:');
	console.log(all);
});

db.all("select * from history", function(err,all){
        console.log('HISTORY:');
	console.log(all);
});
