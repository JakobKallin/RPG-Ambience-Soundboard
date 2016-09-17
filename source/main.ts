import Library from './adventure/library';
import GoogleDrive from './storage/google-drive';
import LoadingLibraryView from './views/loading-library';
import SoundboardView from './views/soundboard';
import GoogleDriveView from './views/google-drive';
import SessionErrorView from './views/session-error';
import WelcomeView from './views/welcome';
import OnlinePlayView from './views/online-play';
import MenuView from './views/menu';
import * as dom from './document';
import * as ui from './ui';
import AmbienceStage from '../libraries/ambience-stage/stage';
import AmbienceStageDOM from '../libraries/ambience-stage/dom';
import { State, transitions } from './state-machine';
import createQueue from './queue';
import * as Persistence from './persistence';
import joinNetworkSession, { Session as NetworkSession } from './network';
import { parseQuery } from './utils';
declare var R:any;

const version = 0;

interface Store {
    adventure?:string,
    welcomed?:boolean,
    zoom?:number,
    session?:string
}
const defaultStore:Store = {};

namespace Storage {
    export function read():Store {
        return <Store> Persistence.read(version, defaultStore);
    }

    export function modify(transaction:(store:Store) => {}):void {
        Persistence.modify(version, defaultStore, transaction);
    }
}

function start() {
    let state:State = State.Loading;
    stateEntered(state);

    const latest:{fade:any, session:NetworkSession} = {
        fade: {
            background: 0,
            foreground: 0,
        },
        session: {
            id: null,
            trigger: () => {},
        }
    };

    const appId = '907013371139';
    const library = Library(GoogleDrive(appId));

    const views = {
        welcome: WelcomeView(dom.id('welcome'), {
            dismiss: () => Storage.modify(store => store.welcomed = true)
        }),
        googleDrive: GoogleDriveView(dom.id('google-drive'), {
            login: () => {
                library.authenticate(false)
                .then(() => {
                    enterState(State.StartingSession);
                    return loadLibrary();
                })
                .catch(error => {
                    enterState(State.SessionError, error)
                });
            }
        }),
        loadingLibrary: LoadingLibraryView(dom.id('loading-library')),
        error: SessionErrorView(dom.id('session-error'), {
            retry: () => {
                enterState(State.StartingSession);
                loadLibrary();
            }
        })
    };

    enterState(State.AccountPossiblyConnected);
    if (!Storage.read().welcomed) {
        ui.showDialog('welcome');
    }

    function showPage(id:string, fade:number=0):void {
        const pages = dom.all('.page');
        const previous = R.last(pages);
        const next = pages.filter(p => p.id === id)[0];
        pages.forEach(p => {
            p.style.transitionProperty = '';
            p.style.transitionDuration = '';
            p.style.opacity = '';
            p.hidden = p !== previous && p !== next;
        });
        document.body.insertBefore(next, previous.nextElementSibling);
        hideAfter(previous, fade);
        fadeIn(next, fade);

        function fadeIn(node:HTMLElement, duration:number):void {
            node.style.opacity = '0';
            node.style.transitionProperty = 'opacity';
            node.style.transitionDuration = duration + 's';
            setTimeout(() => node.style.opacity = '1', 0);
        }

        function hideAfter(node:HTMLElement, duration:number) {
            setTimeout(() => {
                const pages = dom.all('.page');
                // Do not hide if this is the last page, as that means it has
                // been shown again during the timeout.
                if (node !== pages[pages.length - 1]) {
                    node.hidden = true;
                }
            }, duration * 1000);
        }
    }

    function loadLibrary():void {
        let adventureLimit:number = 1;
        let adventureCount:number = 0;
        const signalProgress = {
            adventureListDownloadStarted: () => views.loadingLibrary.event('Downloading adventure list…'),
            adventureListDownloadFinished: (count:number) => {
                views.loadingLibrary.event('Finished downloading adventure list');
                views.loadingLibrary.event('Downloading adventures…');
                adventureLimit = count;
            },
            adventureDownloadStarted: (id:string) => id,
            adventureDownloadError: (id:string) => {
                views.loadingLibrary.error('Error downloading adventure ' + id);
                adventureCount += 1;
                views.loadingLibrary.progress(adventureCount / adventureLimit);
            },
            adventureDownloadFinished: (id:string) => {
                views.loadingLibrary.event('Finished downloading adventure ' + id);
                adventureCount += 1;
                views.loadingLibrary.progress(adventureCount / adventureLimit);
            }
        };

        enterState(State.SessionStarted);
        return library.list(signalProgress)
        .then(adventures => {
            startSoundboard(adventures);
            enterState(State.LibraryLoaded);
        })
        .catch(error => {
            console.error(error);
            enterState(State.SessionError, error)
        });
    }

    let selectedAdventure:any = null;
    const queueFileDownload = createQueue(3);
    const queuePreviewDownload = createQueue(50);
    function startSoundboard(adventures:any):void {
        if (Object.keys(adventures).length === 0) {
            showPage('no-adventures', 0.25);
            return;
        }
        else {
            showPage('soundboard', 0.25);
        }

        R.mapObjIndexed((adventure, id) => {
            adventure.scenes.forEach((scene, i) => {
                scene.id = adventure.id + '/' + i;
            });
        }, adventures);

        const previews = {};
        const files = {};
        const loadFile = R.memoize((id:string) => {
            return new Promise((resolve, reject) => {
                // Immediate timeout because this is actually called before
                // `SoundboardView` returns, so we don't have the soundboard
                // callbacks available to us.
                setTimeout(() => {
                    soundboard.fileProgress(id, 0);
                    return queueFileDownload(() => {
                        return library.download(id, (ratio:number) => {
                            soundboard.fileProgress(id, ratio);
                        });
                    })
                    .then(resolve)
                    .catch(reject);
                }, 0);
            });
        });

        const background = AmbienceStage(AmbienceStageDOM(dom.id('background')));
        const foreground = AmbienceStage(AmbienceStageDOM(dom.id('foreground')));
        const scenesPlaying = {};
        const soundboard = SoundboardView({
            adventures: adventures,
            dropdown: <HTMLSelectElement> document.getElementById('adventure'),
            playScene: playSceneWithId,
            stopAllScenes: stopAllScenes,
            adventureSelected: (id:string) => selectAdventure(id),
            changeVolume: volume => {
                background.volume(volume);
                foreground.volume(volume);
            },
            zoomLevel: Storage.read().zoom || 10,
            zoomed: level => {
                Storage.modify(store => store.zoom = level);
            },
            playOnline: () => ui.showDialog('online-play')
        });
        const playOnline = (id:string) => {
            return joinNetworkSession(id, {
                peerCountChanged: count => {
                    dom.id('player-count-number').textContent = count;
                },
                event: event => {
                    if (event.type === 'scene') playSceneWithId(event.id);
                    if (event.type === 'stop') stopAllScenes();
                }
            })
            .then(session => {
                latest.session = session;
                const url = location.protocol + '//' + location.host + '/?session=' + encodeURIComponent(session.id);
                onlinePlayView.sessionJoined(url);
                document.documentElement.classList.add('online');
            })
            .catch(error => onlinePlayView.sessionError(error.message));
        };
        const onlinePlayView = OnlinePlayView(dom.id('online-play'), {
            startSession: () => {
                const id =
                    Storage.read().session ||
                    // Generate a session ID based on the current timestamp and
                    // a random number. This is not intended to be secure but
                    // simply to reduce the risk of random collisions to a
                    // reasonable level.
                    Date.now().toString(36) + Math.random().toString(36).replace(/\./g, '').substring(0, 8);
                playOnline(id).then(() => {
                    Storage.modify(store => store.session = id);
                });
            },
            joinSession: id => playOnline(id),
            dismiss: () => {}
        });
        const menuView = MenuView(dom.id('menu'), {
            sortAdventuresByTitle: soundboard.sortAdventuresByTitle,
            sortAdventuresByCreationDate: soundboard.sortAdventuresByCreationDate,
            sortAdventuresByModificationDate: soundboard.sortAdventuresByModificationDate,
        });

        if (sessionInUrl()) {
            ui.showDialog('online-play');
            onlinePlayView.joiningSession();
            playOnline(sessionInUrl())
            .then(() => ui.hideDialog());
        }

        selectAdventure(
            adventureInUrl(location.pathname) ||
            Storage.read().adventure ||
            R.sortBy(id => adventures[id].title, Object.keys(adventures))[0]
        );

        dom.on(document, 'keydown', (event:KeyboardEvent):void => {
            if (dom.isControl(<HTMLElement> event.target)) return;
            playSceneWithHotkey(dom.key(event.keyCode));
        });

        dom.on(document, 'keypress', (event:KeyboardEvent):void => {
            if (dom.isControl(<HTMLElement> event.target)) return;
            playSceneWithHotkey(dom.key(event.charCode));
        });

        dom.on(window, 'popstate', () => {
            onPageChange(location.pathname);
        });

        dom.on(dom.id('menu-button'), 'click', () => {
            ui.showDialog('menu');
        });

        function selectAdventure(id:string):void {
            go('/' + id);
        }

        function adventureSelected(id:string):void {
            if (!(id in adventures)) {
                return;
            }

            const adventure = adventures[id];
            selectedAdventure = adventure;
            // Reverse order of scenes because queue is FIFO.
            R.reverse(adventure.scenes).forEach((scene:any) => {
                const firstImage = scene.media.filter(m => m.type === 'image')[0];
                if (firstImage && !(firstImage.file in previews)) {
                    previews[firstImage.file] = queuePreviewDownload(() => {
                        return library.preview(firstImage.file);
                    })
                    .then((url:string) => soundboard.previewLoaded(firstImage.file, url));
                }

                const firstSound = scene.media.filter(m => m.type === 'sound')[0] || { tracks: [] };
                firstSound.tracks.forEach((t:any) => loadFile(t).then((url:string) => {
                    soundboard.fileLoaded(t, url);
                }));
            });
            soundboard.adventureSelected(id);
            Storage.modify(store => store.adventure = id);
        }

        function adventureInUrl(path:string):string {
            const id = path.substring(1);
            return id ? id : null;
        }

        function go(path:string):void {
            history.pushState(null, '', path);
            onPageChange(location.pathname);
        }

        function onPageChange(path:string):void {
            if (adventureInUrl(path)) {
                adventureSelected(adventureInUrl(path));
            }
        }

        function playSceneWithHotkey(hotkey:any):void {
            if (!selectedAdventure) return;

            const scenes = selectedAdventure.scenes.filter((s:any) => s.key === hotkey);
            scenes.forEach(playScene);
        }

        function playSceneWithId(id:string):void {
            const adventureId = id.split('/')[0];
            const sceneIndex = id.split('/')[1];
            const scene = adventures[adventureId].scenes[sceneIndex];
            playScene(scene);
        }

        function stopAllScenes():void {
            latest.session.trigger({ type: 'stop' });
            background.start([], latest.fade.background * 1000);
            foreground.start([], latest.fade.foreground * 1000);
        }

        function playScene(scene:any):void {
            latest.session.trigger({ type: 'scene', id: scene.id });

            const firstImage = scene.media.filter(m => m.type === 'image')[0];
            const firstSound = scene.media.filter(m => m.type === 'sound')[0] || { tracks: [] };
            Promise.all(firstSound.tracks.map((t:any) => loadFile(t)))
            .then(soundFiles => {
                const items:any[] = [];
                if (soundFiles.length > 0) {
                    items.push({
                        type: 'sound',
                        tracks: soundFiles,
                        loop: firstSound.loop,
                        overlap: firstSound.overlap * 1000,
                        shuffle: firstSound.shuffle,
                        volume: firstSound.volume / 100
                    });
                }

                const layer = scene.layer === 'foreground' ? foreground : background;
                latest.fade[scene.layer] = scene.fade.out;
                // Timeout to prevent appearance of slow clicks. TODO: Optimize
                // rendering so it's fast enough to perform here.
                let ended = false;
                setTimeout(() => { if (!ended) soundboard.sceneStarted(scene.name) }, 0);
                layer.start(items, scene.fade.in * 1000).then(() => {
                    // Timeout to match the one above, to reduce the risk of
                    // `sceneEnded` taking place before `sceneStarted`. TODO:
                    // Remove this as well.
                    setTimeout(() => {
                        ended = true;
                        soundboard.sceneEnded(scene.name);
                    }, 0);
                });
            });
        }
    }

    function attemptImmediateLogin():void {
        library.authenticate(true)
        .then(() => enterState(State.AccountConnected))
        .catch(() => enterState(State.AccountNotConnected));
    }

    function enterState(newState:State, arg?:any):void {
        if (R.contains(newState, transitions(state))) {
            state = newState;
            stateEntered(newState, arg);
        }
        else {
            throw new Error('Invalid state transition: ' + state + ' to ' + newState);
        }
    }

    function stateEntered(state:State, arg?:any):void {
        switch(state) {
            case State.Loading: break;
            case State.AccountPossiblyConnected: attemptImmediateLogin(); break;
            case State.AccountConnected:
                enterState(State.StartingSession);
                loadLibrary();
                break;
            case State.AccountNotConnected: showPage('google-drive', 0.25); break;
            case State.StartingSession: showPage('loading-library', 0.25); break;
            case State.SessionStarted: break;
            case State.LibraryLoaded: break;
            case State.SessionError:
                views.error.error(<Error> arg);
                showPage('session-error', 0.25);
                break;
            default: throw new Error('Unhandled state: ' + state);
        }
    }

    function sessionInUrl():string {
        return parseQuery(location)['session'];
    }
}

dom.on(window, 'DOMContentLoaded', () => {
    try {
        start();
    }
    catch(error) {
        // This code intentionally uses only direct DOM manipulation with old
        // APIs, as we want maximum browser support for this section.
        const loadingPage = document.getElementById('loading-app');
        loadingPage.parentNode.removeChild(loadingPage);
        document.getElementById('loading-error-text').textContent = error.stack;
        document.getElementById('loading-error-browser-id').textContent = navigator.userAgent;
    }
});
