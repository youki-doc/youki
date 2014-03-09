var parser = require('../lib/youki-syntax.js');
var runtime = require('../lib/runtime.js');
var fs = require('fs');
var util = require('util');
var path = require('path');

require.extensions['.yk'] = function(module, filename){
	var text = fs.readFileSync(filename, 'utf-8');
	try {
		var startTime = new Date();
		var ast = [new runtime.Reference('.cons_block')].concat(parser.parse(text, {
			Reference: runtime.Reference,
			Position: function(offset){
				return {
					module: module,
					offset: offset
				}
			}
		}));
		var endTime = new Date();
//		console.log('Parse ' + filename + ' used ' + (endTime - startTime))
	} catch(ex) {
		throw ex;
	};
	module.exports.filename = filename;
	module.exports.source = text;
	module.exports.apply = function(scope, rt){
		return runtime.evaluate(scope, ast);
	}
}

exports.init = function(){
	var scope = Object.create(runtime.globalScope);
	scope.path = path;
	scope._loaderDir = path.dirname(module.fileName);
	scope['load-library'] = function(filename){
		require(filename).apply(scope, runtime);
	}
	scope.input = function(filename){
		require(path.resolve(filename)).apply(scope, runtime);
	}
	return scope;
}