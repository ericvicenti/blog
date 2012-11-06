var _ = require("underscore");
var settings = require("./settings.js");
var moment = require("moment");
var diff = require("diff");
var Showdown = require('showdown');
var converter = new Showdown.converter();
var postmark = require("postmark")(settings.postmarkAPIKey);

_.mixin({
	endsWith: function(str, end){
	    var lastIndex = str.lastIndexOf(end);
	    return (lastIndex != -1) && (lastIndex + end.length == str.length);
	}
});
_.mixin({
	diff: diff,
	showdown: converter.makeHtml,
	createPatch: function(startStr, destStr){
		var patch = diff.createPatch('asdf.txt',startStr,destStr);
		var searchable = [];
		var d = diff.diffWords(startStr,destStr);
		_.each(d, function(d){
			if(d.added) searchable.push(d.value);
		});
		searchable = searchable.join(' ');
		console.log(searchable);
		return {
			patch: patch,
			searchable: searchable
		};
	},
	email: postmark.send,
	//_.email({
    //     "From": "donotreply@example.com", 
    //     "To": "target@example.us", 
    //     "Subject": "Test", 
    //     "TextBody": "Test Message",
		    // "Attachments": [{
		    //       "Content": File.readFileSync("./unicorns.jpg").toString('base64'),
		    //       "Name": "PrettyUnicorn.jpg",
		    //       "ContentType": "image/jpeg"
		    //     }]
    // });
	compilePatch: function(startStr, patch){
		var destStr = diff.applyPatch(startStr, patch);
		return destStr;
	},
	trunc: function(s, n){
		return s.substr(0,n-1)+(s.length>n?'&hellip;':'');
	},
	parseVersion: function(str){
		var a = str.split('.');
		var b = a[a.length-1];
		var c = Number(b);
		if(b!=String(c)) return false;
		return {
			version: c,
			path: str.substr(0,str.length-(b.length+1))
		}
	},
	trimStr: function(start, trimmer){
		return start.substr(0,start.length-trimmer.length);
	},
	moment: moment,
	slugify: function(text) {
		text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
		text = text.replace(/-/gi, "_");
		text = text.replace(/\s/gi, "-");
		return text;
	}
});

module.exports = _;