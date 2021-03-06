'use strict';

require ('../../../webida-server/lib/init/init-process.js');

const { debugFactory, fsx, URI, util } = __webida.libs; 

const electron = require('electron');

if (!electron.ipcRenderer) {
    throw new Error('renderer/lib/common.js can be used in renderer process only');
}

function rendererDebugFactory (moduleName) {
    return function rendererDebug() {
        electron.ipcRenderer.send('debug', {
            moduleName,
            args: arguments
        });
    };
};


function debugAlert() {
    if (__webida.env.debug) {
        let msg = '';
        let arg0 = arguments[0];
        if ( typeof(arg0) === 'object' && !(arg0 instanceof String) ){
            if (arg0 instanceof Error) {
                msg = arg0.stack || arg0.toString();
            } else {
                if (arguments.length > 1) {
                    msg =  JSON.stringify(arguments, null, 2);
                } else {
                    msg =  JSON.stringify(arg0, null, 2);
                }
            }
        } else {
            msg = util.format.apply(util, arguments);
        }
        window.alert(msg);
    }
}

function hasDirectory(dirPath) {
    try {
        return fsx.lstatSync(dirPath).isDirectory();
    } catch (e) {
        return false;
    }
}

function getQueryParamsFromLocation() {
    try{
        let uri = new URI(window.location.href);
        return uri.query(true);
    } catch(e) {
        return {};         
    }
}

module.exports = {
    debugAlert,
    debugFactory : rendererDebugFactory,
    getQueryParamsFromLocation,
    hasDirectory,
    ipc : electron.ipcRenderer ? electron.ipcRenderer : electron.ipcMain,
    rendererWindow : electron.remote.getCurrentWindow()
};