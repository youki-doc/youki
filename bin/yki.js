#!/usr/bin/env node
var path = require('path')
var argv = require('yargs')
	.boolean('f').describe('f', 'Find and Import .youki-common/')
	.boolean('debug').describe('debug', 'Enable debug mode')
	.argv;
var fs = require('fs')
var pm = require('../lib/pm.js');
var scope = pm.init();
scope['load-library'](scope.directories.loader + '/ove');

if (argv._[0]) {
	var inputPath = path.resolve(argv._[0]);
	if (argv.f) {
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
	scope['input-path'] = inputPath
	scope['load-library'](inputPath)
} else {
	console.error('Missing input')
}