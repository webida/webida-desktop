module.exports = {
    ideWindowDefaults: {
        width: 1280,
        height: 720,
        maxmize: false
    },
    
    defaultWorkspace : {
        workspace: 'webida.org',
        workspaceType : 'legacy' // local for embedded, 'remote' for legacy or stand-alone server
    },
    
    autostart : true,
    
    remotes: {
        // test only.
        "webida.org": {
            personal_token: "cie9mm53302dbqv9m9hbydp5x",
            workspace: "VyWOtVHt5/plugin-manager",
            legacy : "webida.org"
        },
        "my-local-default" : {
            url : "http://127.0.0.1:5050",
            user_id : "test@webida.org",
            password : "test@webida.org",
            workspace : "/c:/Users/Test/webida-workspace"
        }
    },

    legacySiteConfigs : {
        "webida.org" : {
            // for test only. (values should be injected by configurator ui automatically, fetching from legacy server)
            appServer: "https://app.webida.org",
            authServer: "https://auth.webida.org",
            fsServer: "https://fs.webida.org",
            buildServer: "https://build.webida.org",
            ntfServer : "https://ntf.webida.org",
            connServer: "https://conn.webida.org",
            corsServer: "https://cors.webida.org",
            deploy: {
                type: "domain",
                pathPrefix: "-"
            }
        }
    }
};