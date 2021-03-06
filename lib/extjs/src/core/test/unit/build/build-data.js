/*

This file is part of Ext JS 4

Copyright (c) 2011 Sencha Inc

Contact:  http://www.sencha.com/contact

Commercial Usage
Licensees holding valid commercial licenses may use this file in accordance with the Commercial Software License Agreement provided with the Software or, alternatively, in accordance with the terms contained in a written agreement between you and Sencha.

If you are unsure which license is appropriate for your use, please contact the sales department at http://www.sencha.com/contact.

*/
if (system.args.length !== 1) {
    system.print('Usage:');
    system.print('  hammerjs build-data.js');
    system.exit(-1);
}

var scanDirectory = function (path) {
    var entries = [],
        subdirs;
    if (fs.exists(path) && fs.isFile(path) && path.match('.js$')) {
        entries.push(path);
    } else if (fs.isDirectory(path)) {
        fs.list(path).forEach(function (e) {
            subdirs = scanDirectory(path + '/' + e);
            subdirs.forEach(function (s) {
                entries.push(s);
            });
        });
    }
    return entries;
};
var specsFolder = ['../spec' ],
specs = [];
for (var i = 0; i < specsFolder.length; i++) {
    specs = specs.concat(scanDirectory(specsFolder[i]));
}

var output = [];

for (var i = 0; i < specs.length; i++) {
    output.push("'"+specs[i].replace('../', '')+"'");
}

system.print("/* DO NO EDIT THIS FILE MANUALLY IT IS GENERATED AUTOMATICALLY BY ../build/build.sh */\n this.ExtSpecs = [" + output.join(",") + "];");
