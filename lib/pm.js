var parser = require('../lib/parser.js');
var runtime = require('../lib/runtime.js');
var fs = require('fs');
var util = require('util');
var path = require('path');

require.extensions['.yk'] = function(module, filename){
	var ast = parser.parse(fs.readFileSync(filename, 'utf-8'));
	console.log(util.inspect(ast, {depth: null}))
	module.exports.apply = function(scope, rt){
		return runtime.evaluate(scope, ast);
	}
}

exports.init = function(){
	var scope = Object.create(runtime.globalScope);
	scope.path = path;
	scope._loaderDir = path.dirname(module.fileName);
	scope.loadLibrary = function(filename){
		require(filename).apply(scope, runtime);
	}
	scope.input = function(filename){
		require(path.resolve(filename)).apply(scope, runtime);
	}
	return scope;
}