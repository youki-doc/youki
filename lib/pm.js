var parser = require('../lib/youki-syntax.js');
var runtime = require('../lib/runtime.js');
var fs = require('fs');
var util = require('util');
var path = require('path');

function parseText(text, config) {
	try {
		var ast = [new runtime.Reference('.cons_block')].concat(parser.parse(text, config));
	} catch (e) {
		process.stderr.write(filename + "\n");
		process.stderr.write(util.inspect(e));
		throw e;
	}
	var endTime = new Date();
	return {
		source: text,
		ast: ast
	}
}

function parseFile(filename, config) {
	var startTime = new Date();
	var text = fs.readFileSync(filename, 'utf-8');
	return parseText(text, config);
}
function createLoadFunctionsFor(module, s, gs) {
	// s is the scope used for evaluating module body
	// and gs is the global scope.
	function fnRequire(file) {
		if (typeof file === 'string') return module.require(file);
		else return file
	}

	s['load-text'] = function (text, filename) {
		return runText(text, module, filename).apply(gs, gs, runtime);
	}
	s['load-library'] = function (file) {
		return fnRequire(file).apply(gs, gs, runtime);
	};
	s['require-library'] = function (file) {
		return fnRequire(file).apply(gs, Object.create(gs), runtime);
	};
	s['load-library-for-scope'] = function (t, file) {
		return fnRequire(file).apply(gs, t, runtime);
	};
	s['load-library-here'] = function (file) {
		return fnRequire(file).apply(gs, this, runtime);
	}
}

function runText(text, module, filename) {
	var parseResult = parseText(text, {
		Reference: runtime.Reference,
		Position: function (offset) {
			return {
				module: module,
				offset: offset
			}
		}
	});
	return run(parseResult, module, filename || "");
}

function run(parseResult, module, filename) {
	module.exports.filename = filename;
	module.exports.source = parseResult.source;
	var ast = parseResult.ast;

	function evaluateModule(scope, exports, tfm) {
		var s = Object.create(scope);
		s.exports = {};
		if (filename) s['module-path'] = filename;
		s.export = new runtime.Macro(function ($id, $value) {
			if (!$id instanceof runtime.Reference) {
				throw new Error($id + ' must be a reference')
			};
			if ($value) {
				s.exports[$id.id] = this.evaluate($value)
			} else {
				s.exports[$id.id] = this.evaluate($id)
			}
		});
		if (filename) createLoadFunctionsFor(module, s, scope);
		runtime.evaluate(s, tfm(ast, module));
		return s.exports;
	}

	module.exports.applyWithTFM = function (scope, exports, rt, tfm) {
		let moduleExports = evaluateModule(scope, exports, tfm)
		for (var id in moduleExports) {
			runtime.setf(exports, id, moduleExports[id])
		};
		return moduleExports;
	}
	module.exports.apply = function (scope, exports, rt) {
		return module.exports.applyWithTFM(scope, exports, rt, function (x) { return x })
	}
	return module.exports;
}

require.extensions['.yk'] = function (module, filename) {
	var parseResult = parseFile(filename, {
		Reference: runtime.Reference,
		Position: function (offset) {
			return {
				module: module,
				offset: offset
			}
		}
	});
	return run(parseResult, module, filename);
}

exports.init = function () {
	var scope = Object.create(runtime.globalScope);
	scope.path = path;
	scope.directories = { loader: __dirname };
	scope.paths = {};
	createLoadFunctionsFor(module, scope, scope);
	return scope;
}