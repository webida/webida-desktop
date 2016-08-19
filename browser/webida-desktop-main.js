"use strict";
require('../webida-server/lib/init/init-process.js');

//
// importing conventions
//   0) if urgent, some module (like init-process.js) should be imported
//   1) import modules provided by runtime (like node.js basic API)
//   2) import 3rd party library
//   3) import common local library, shared with other modules
//   4) import internal local library, private for this module
// all importing should use 'var'

const { path, debugFactory, URI } = __webida.libs;
const debug = debugFactory(module);

const electron = require('electron');
const EmbeddedWebidaServer = require('../webida-server/lib/EmbeddedWebidaServer.js');

let app = electron.app;
let windowRegistry = { };   // map workspace id (type:fsid/dirname) to electron BrowserWindow object
let bootWindow = null;
let server = null;

app.on('window-all-closed', function () {
    debug('all windows are closed. quitting app now');
    if (server) {
        server.stop().then( () => {
            debug('stopped server');
            return server.destroy();
        }).then( () => {
            server = null;
            app.quit();
        })         
    } else {
        app.quit();
    }
});

app.on('ready', function () {

    let webidaDesktopMenu = require('./webida-desktop-menu.js');
    
    function initApp() {
        const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
            // Someone tried to run a second instance, we should focus the workspace or create new ide window 
            debug("command line = " + commandLine);
            console.error ('Sorry, single instance only, yet');
            // TODO : parse command line, find workspace id,
            //   and start ide or set focus to current working ide
        });
        
        if (!shouldQuit) {
            let Menu = electron.Menu;
            if (!__webida.env.debug) {
                Menu.setApplicationMenu(null);
            }
        }
        else {
            app.quit(); 
        }
    }

    function initIpcMain(handlers) {
        const ipc = require('electron').ipcMain;
        Object.keys(handlers).forEach((channel) => {
            ipc.on(channel, (event, arg) => {
                let handler = handlers[channel];
                if(channel !== 'debug') {
                    debug(`ipc channel ${channel} event ${JSON.stringify(event)} arg ${JSON.stringify(arg)} `)
                }
                if( channel.endsWith('-sync') ){
                    try {
                        event.returnValue = handler(event, arg);
                    } catch(e) {
                        event.returnValue = e;
                    }
                } else {
                    return handler(event, arg);
                }
            });
        });
    }

    function initServerAsync() {
        server = new EmbeddedWebidaServer();
        return server.init().then( () => webidaDesktopMenu.setServer(server) ); 
    }

    function loadHtml(win, htmlPath, queryParams) {
        let uri = new URI("file:///" + htmlPath);
        let url = uri.query(queryParams || {}).toString();
        debug(`window ${win.id} tries to load ${url}`);
        win.loadURL(url);
    }

    function createBootTargetArgument(arg) {
        let segments = arg.split(':');
        let newBootTarget = {};
        let handleLocalDirectoryPath = (localDir) => {
            newBootTarget.workspaceType = 'local';
            newBootTarget.workspace = path.resolve(localDir);
        };

        if (segments.length >= 2) {
            let type = segments[0];
            if ( type === 'remote ' || type === 'legacy') {
                newBootTarget.workspaceType = type;
                newBootTarget.workspace = segments.splice(1).join(':')
            } else {
                if (type === 'local') {
                    handleLocalDirectoryPath(segments.splice(1).join(':'));
                } else {
                    handleLocalDirectoryPath(segments.join(':'));
                }
            }
        } else {
            handleLocalDirectoryPath(segments[0]);
            return newBootTarget;
        }
        return newBootTarget;
    }

    function createBootWindow(bootTarget) {
        let win = new electron.BrowserWindow({
            center: true,
            title: 'Webida Desktop Launcher',
            show : false
            // boot.html may resize self later, with window-size event
        });
        win.on('close', (e) => {
            bootWindow = null;
            e.returnValue = true;
        });
        let htmlPath = path.resolve (__dirname, "renderer", "boot.html");
        loadHtml(win, htmlPath, bootTarget);
        return win;
    }

    function createIDEWindow(queryParams) {
        let win = new electron.BrowserWindow({
            center: true,
            title: 'Webida IDE - ' + queryParams.workspace,
            autoHideMenuBar: !__webida.env.debug
        });
        let htmlPath = path.resolve (__dirname, "..", "contents",
            "webida-client", "apps", "ide", "src", "index.html");
        loadHtml(win, htmlPath, queryParams);
        return win;
    }

    try {
        initApp();

        // TODO : refactoring - should split each handler to a separated file 
        initIpcMain({
            'debug' : (event, args) => {
               if (args.msg) {
                   let debugFunction = debugFactory(args.moduleName || 'renderer');
                   debugFunction(args.msg || JSON.stringify(args));
               }
            },

            // boot.html will send this
            //   when mustBeConfigured in url is true, boot.html will rewrite config & send 'boot-server' message
            //   main should send 'boot-client' message with server error value
            //   boot.html continues to load webida-client when if event argument is true
            'boot-client' : (event, bootTarget) => { // from boot.html . async
                let win = null;
                let bootWorkspace = null;
                let registryId = bootTarget.workspaceType + ":" + bootTarget.workspace;

                // TODO : define BootTarget class first. too dirty

                let createIdeArgs = () => {
                    if (bootTarget.workspaceType === 'legacy') {
                        debug("client boot args %j", bootTarget.ideArgs);
                        return bootTarget.ideArgs;
                    }
                    // boot target contains
                    //   workspace : workspace path
                    let ws = null;
                    return server.addDisposableWorkspaceAsync(bootTarget.workspace)
                        .then( (newWorkspace) => {
                            ws = newWorkspace;
                            debug ({ ws } , 'gotWorkspace');
                            return server.addMasterTokenAsync();
                        })
                        .then( (masterToken) => {
                            debug( { masterToken} , 'got master token');
                            const args = {
                                serverUrl: server.serviceUrl,
                                masterToken: masterToken.text,
                                workspaceId: ws.id,
                                // for legacy client compatiblity
                                workspace: ws.id + '/' + path.basename(ws.workspacePath)
                            };
                            debug(args, "client boots with arguments", args);
                            return args;
                        });
                    // end of promise chain
                };


                let bootClient = (ideArgs) => {
                    win = createIDEWindow(ideArgs);
                    win.on('close', (event) => {
                        debug(`window ${win.id} will be closed for workspace ${registryId}`);
                        delete windowRegistry[registryId];
                        event.returnValue = true;
                    });
                    windowRegistry[registryId] = win;
                    event.sender.send('boot-result', {});
                    debug("boot-server complete, sent boot result");
                };


                debug("server starting");
                server.start()
                    .then( () => createIdeArgs() )
                    .then( (ideArgs) => bootClient(ideArgs) )
                    .catch( (e) => {
                        debug({ e }, 'server booting failed - renderer should not proceed');
                        event.sender.send('boot-result', {error :e.stack || e});
                    })
             },

             'restart-server-sync' : (event, arg) => { // from webida-client , async
                 // TODO : implement me
             }
        });
        initServerAsync().then( () => {
            let workspaceArg = __webida.args[0];
            if (workspaceArg) {
                let bootTarget = createBootTargetArgument(workspaceArg);
                bootWindow = createBootWindow(bootTarget);
            } else {
                // empty boot Target
                bootWindow = createBootWindow({});
            }
        });
    } catch (e) {
        console.error(e.stack);
        throw e;
    }
});