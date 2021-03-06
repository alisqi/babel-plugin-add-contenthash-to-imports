/* jshint node: true, esversion: 6 */
const pathLib = require('path');
const md5File = require('md5-file');

const md5Map = new Map();

function transform ({filename: scriptPath}, moduleName) {
	const fileToImport = pathLib.resolve(
		pathLib.dirname(scriptPath) + '/' + moduleName
	);
	
	if (
		moduleName.substring(0, 1) !== '.' ||					// not a relative path
		moduleName.substring(moduleName.length - 3) !== '.js'	// doesn't end in .js
	) {
		return moduleName;
	}
	
	if (!md5Map.has(fileToImport)) {
		const hash = md5File.sync(fileToImport).substr(0, 8);
		md5Map.set(fileToImport, hash);	// 8 chars is plenty, according to https://blog.risingstack.com/automatic-cache-busting-for-your-css/
	}
	const hash = md5Map.get(fileToImport);
	
	// change the module name
	return moduleName.substr(0, moduleName.length - 3) + `.js?v=${hash}`;	// './lib/mod.js' => './lib/mod.js?v=abcd1234'
}

module.exports = function ({types}) {
	return {
		visitor: {
			ImportDeclaration: function (path, state) {
				const moduleNameSL = path.node.source;	// must be StringLiteral (e.g., '../lib/mod.js')
				
				moduleNameSL.value = transform(state, moduleNameSL.value);
			},
			
			Import: function (path, state) {
				let moduleNameSL = path.parent.arguments[0];
				if (!types.isStringLiteral(moduleNameSL)) {
					throw new Error(
						'Cannot transform dynamic import if argument is not string literal' +
							' (' + state.filename + ':' + path.node.loc.start.line + ')'
					);
				}
				moduleNameSL.value = transform(state, moduleNameSL.value);
			}
		}
	};
};
