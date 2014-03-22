#!/usr/bin/env node
var path = require('path')
var argv = require('optimist')
	.boolean('f').describe('f', 'Find and Import .youki-common/')
	.boolean('debug').describe('debug', 'Enable debug mode')
	.argv;
var fs = require('fs')
var pm = require('../lib/pm.js');
var scope = pm.init();
scope['load-library'](scope.directories.loader + '/ove');

if(argv._[0]) {
	if(argv.f) {
		var cwd = path.resolve(path.dirname(argv._[0]));
		do {
			if(fs.existsSync(path.resolve(cwd, '.youki-common/package.json'))){
				scope.directories['input-common'] = path.join(path.resolve(cwd), ".youki-common/");
				scope['load-library'](path.resolve(cwd, '.youki-common/'));
				break;
			};
		} while(cwd !== (cwd = path.resolve(cwd, '..')));
	}
	scope['load-library'](path.resolve(argv._[0]))
} else {
	console.error('Missing input')
}