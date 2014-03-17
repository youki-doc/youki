var parser = require('../lib/youki-syntax.js');
var runtime = require('../lib/runtime.js');
var fs = require('fs');
var util = require('util');
var path = require('path');

function parseFile(filename, config){
	var startTime = new Date();
	var text = fs.readFileSync(filename, 'utf-8');
	var ast = [new runtime.Reference('.cons_block')].concat(parser.parse(text, config));
	var endTime = new Date();
	//console.log("Parse " + filename + " used " + (endTime - startTime))
	return {
		source: text,
		ast: ast
	}
}
function createLoadFunctionsFor(module, s, gs){
	function fnRequire(file){
		if(typeof file === 'string') return module.require(file);
		else return file
	}
	s['load-library-with-tfm'] = function(file, tfm) {
		return fnRequire(file).applyWithTFM(gs, runtime, tfm);
	};
	s['load-library'] = function(file) {
		return fnRequire(file).apply(gs, runtime);
	};
	s['require-library-with-tfm'] = function(file, tfm) {
		return fnRequire(file).applyWithTFM(Object.create(gs), runtime, tfm);
	};
	s['require-library'] = function(file) {
		return fnRequire(file).apply(Object.create(gs), runtime);
	};
}

require.extensions['.yk'] = function(module, filename){
	var applied = false;
	var appliedResult;

	var parseResult = parseFile(filename, {
		Reference: runtime.Reference,
		Position: function(offset){
			return {
				module: module,
				offset: offset
			}
		}
	});
	module.exports.filename = filename;
	module.exports.source = parseResult.source;
	var ast = parseResult.ast
	module.exports.applyWithTFM = function(scope, rt, tfm){
		if(applied) return appliedResult;
		// For any module, <scope> is "near-global".
		var s = Object.create(scope);
		var exportObjects = {}
		s.export = new runtime.Macro(function($id, $value){
			if(!id instanceof runtime.Reference) {
				throw new Error($id + ' must be a reference')
			};
			if($value) {
				exportObjects[$id.id] = this.evaluate($value)
			} else {
				exportObjects[$id.id] = this.evaluate($id)				
			}
		});
		createLoadFunctionsFor(module, s, scope);
		var result = appliedResult = runtime.evaluate(s, tfm(ast, module));
		for(var id in exportObjects) {
			runtime.setf(scope, id, exportObjects[id])
		};
		return exportObjects;
	}
	module.exports.apply = function(scope, rt){
		return module.exports.applyWithTFM(scope, rt, function(x){ return x })
	}
}

exports.init = function(){
	var scope = Object.create(runtime.globalScope);
	scope.path = path;
	scope.directories = {
		loader: __dirname
	}
	createLoadFunctionsFor(module, scope, scope);
	return scope;
}