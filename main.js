const fs = require('fs');
const path = require('path');
const pm = require('./lib/pm.js');

const newScope = function () {
	const scope = pm.init();
	scope['load-library'](scope.directories.loader + '/ove');
	return scope;
}

function loadPointYouki(scope, inputPath) {
	var cwd = path.dirname(inputPath);
	do {
		if (fs.existsSync(path.resolve(cwd, '.youki-common/package.json'))) {
			scope.directories['input-common'] = path.join(cwd, ".youki-common/");
			scope.directories['base'] = cwd;
			scope['load-library'](path.join(cwd, ".youki-common/"));
			break;
		};
	} while (cwd !== (cwd = path.resolve(cwd, '..')));
}

function loadPath(scope, inputPath) {
	scope['input-path'] = inputPath;
	scope['load-library'](inputPath);
}

function loadText(scope, text, path) {
	scope['load-text'](text, path);
}

module.exports.newScope = newScope;
module.exports.loadPointYouki = loadPointYouki;
module.exports.loadPath = loadPath;
module.exports.loadText = loadText;