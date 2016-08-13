import * as dom from './document';
declare var gapi:any;
declare var R:any;

interface Network {
    startSession: (id?:string) => Promise<Session>,
    joinSession: (id:string) => Promise<Session>
}

export interface Session {
    id:string,
    trigger:(any) => void,
    pause:(Function) => void
}

export default function(appId:string, onEvent:(value:any, index:number) => void):Network {
    const loadOnce = R.memoize(load);
    return {
        startSession: id => loadOnce().then(() => host(id, onEvent)),
        joinSession: id => loadOnce().then(() => connect(id, onEvent))
    };
}

function host(id, onEvent) {
    if (id) {
        console.log('Hosting existing session: ' + id);
        return connect(id, onEvent).catch(() => {
            console.log('Error using existing file: ' + id + '; creating new file');
            return create().then(newId => connect(newId, onEvent));
        });
    }
    else {
        console.log('Hosting new session');
        return create().then(newId => connect(newId, onEvent));
    }
}

function connect(id:string, onEvent):Promise<Session> {
    return new Promise((resolve, reject) => {
        console.log('Connecting to session: ' + id);
        gapi.drive.realtime.load(id, startEditing, createModel, error => {
            // If the provided file does not exist (for example if its ID was
            // saved in the app but the file itself was removed from Google
            // Drive), simply create a new one.
            if (error.type === 'not_found') {
                host(null, onEvent).then(resolve).catch(reject);
            }
            else {
                reject(error);
            }
        });

        function startEditing(doc) {
            try {
                console.log('Connected to session: ' + id);
                const events = doc.getModel().getRoot().get('events');
                events.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, event => {
                    if (!event.isLocal) {
                        event.values.forEach((v, i) => onEvent(v, i + event.index));
                    }
                });

                let paused = false;
                resolve({
                    id: id,
                    trigger: newEvent => {
                        if (!paused) {
                            events.push(newEvent)
                        }
                    },
                    pause: callback => {
                        paused = true;
                        callback();
                        paused = false;
                    }
                });
            }
            catch(error) {
                reject(error);
                throw error;
            }
        }

        function createModel(model) {
            try {
                model.getRoot().set('events', model.createList());
            }
            catch(error) {
                reject(error);
                throw error;
            }
        }
    });
}

function create():Promise<string> {
    return new Promise((resolve, reject) => {
        console.log('Creating new file');
        gapi.client.drive.files.create({
            resource: {
                name: 'RPG Ambience Soundboard ' + new Date().toLocaleString(),
                mimeType: 'application/vnd.google-apps.drive-sdk'
            }
        })
        .execute(file => {
            if (file.error) {
                reject(file.error);
            }
            else {
                console.log('Created new file: ' + file.id);
                gapi.client.drive.permissions.create({
                    fileId: file.id,
                    resource: {
                        type: 'anyone',
                        role: 'writer'
                    }
                })
                .execute(permission => {
                    if (permission.error) {
                        reject(permission.error);
                    }
                    else {
                        resolve(file.id);
                    }
                });
            }
        });
    });
}

function load() {
    const scripts = [
        'https://apis.google.com/js/api.js',
        'https://www.gstatic.com/realtime/realtime-client-utils.js'
    ];
    return Promise.all(scripts.map(dom.loadScript))
    .then(() => {
        return new Promise((resolve, reject) => {
            gapi.load('auth:client,drive-realtime,drive-share', () => {
                gapi.client.load('drive', 'v3').then(() => {
                    resolve();
                }, reject);
            }, reject);
        });
    });
}
