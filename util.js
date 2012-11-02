var _ = require("underscore");
var moment = require("moment");
var diff = require("diff");

_.mixin({
	diff: diff,
	createPatch: function(startStr, destStr){
		var patch = diff.createPatch('asdf.txt',startStr,destStr);
		return patch;
	},
	compilePatch: function(startStr, patch){
		var destStr = diff.applyPatch(startStr, patch);
		return destStr;
	},
	trunc: function(s, n){
		return s.substr(0,n-1)+(s.length>n?'&hellip;':'');
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