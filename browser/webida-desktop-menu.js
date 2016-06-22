"use strict";

let isDarwin = process.platform === 'darwin';
let {BrowserWindow} = require('electron');

let server = null;

// TODO
//  - implement application menu for darwin, including some standard roles
//  - support renderer processes who want more than application menu
//   (e.g. main window needs no window-specific menu but ide needs devtools)

let debuggableMenu =
	[
		// first top-level menu
		{
			label: '&View',
			submenu: [
                {
                    label: '&Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: function () {
                        BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache();
                    }
                },
                {
                    label: 'Toggle &Developer Tools',
                    accelerator: isDarwin ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: function () {
                        BrowserWindow.getFocusedWindow().toggleDevTools();
                    }
                }
            ]
		} // end of main View menu
	];

module.exports = {
    // currently, default menu will do
	menuTemplate : __webida.env.debug ? null : debuggableMenu,
	setServer(instance) {
		server = instance;
	}
};