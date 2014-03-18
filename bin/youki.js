#!/usr/bin/env node
var path = require('path')
var argv = require('optimist')
	.boolean('f').describe('f', 'Find and Import .youki-common/')
	.boolean('debug').describe('debug', 'Enable debug mode')
	.argv;

var pm = require('../lib/pm.js');
var scope = pm.init();
scope['load-library'](scope.directories.loader + '/ove');
scope.argv = argv._;

if(argv.f) {
	var cwd = path.resolve(path.dirname(scope.inputPath));
	do {
		if(existsSync(path.resolve(cwd, '.youki-common/package.json'))){
			scope.directories['input-common'] = path.resolve(cwd);
			scope['load-library'](path.resolve(cwd, '.youki-common/'));
			break;
		};
	} while(cwd !== (cwd = path.resolve(cwd, '..')));
}

if(argv._[0]) {
	scope['load-library'](path.resolve(argv._[0]))
} else {
	console.error('Missing input')
}