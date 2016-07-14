import Library from './adventure/library';
import GoogleDrive from './storage/google-drive';
import LoadingLibraryView from './views/loading-library';
import SoundboardView from './views/soundboard';
import GoogleDriveView from './views/google-drive';
import SessionErrorView from './views/session-error';
import * as dom from './document';
import AmbienceStage from '../libraries/ambience-stage/stage';
import AmbienceStageDOM from '../libraries/ambience-stage/dom';
import { State, transitions } from './state-machine';
import createQueue from './queue';
import * as Persistence from './persistence';
declare var R:any;

const version = 0;

interface Store {
    adventure?:string
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

dom.on(window, 'DOMContentLoaded', () => {
    let state:State = State.Loading;
    stateEntered(state);
    
    const latest = {
        fade: {
            background: 0,
            foreground: 0
        }
    };
    
    const appId = '907013371139';
    const library = Library(GoogleDrive(appId));
    
    const views = {
        googleDrive: GoogleDriveView(dom.id('google-drive'), {
            login: () => {
                enterState(State.StartingSession);
                library.authenticate(false)
                .then(loadLibrary)
                .catch(error => {
                    enterState(State.SessionError, error)
                })
            }
        }),
        loadingLibrary: LoadingLibraryView(dom.id('loading-library')),
        error: SessionErrorView(dom.id('session-error'))
    };
    
    enterState(State.AccountPossiblyConnected);
    
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
        document.body.insertBefore(next, previous.nextElementChild);
        hideAfter(previous, fade);
        fadeIn(next, fade);
        
        function fadeIn(node:HTMLElement, duration:number):void {
            node.style.opacity = '0';
            node.style.transitionProperty = 'opacity';
            node.style.transitionDuration = duration + 's';
            node.style.opacity = '1';
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
            adventureDownloadFinished: (id:string) => {
                views.loadingLibrary.event('Finished downloading adventure ' + id);
                adventureCount += 1;
                views.loadingLibrary.progress(adventureCount / adventureLimit);
            }
        };
        
        enterState(State.SessionStarted);
        return library.list(signalProgress)
        .then(adventures => {
            enterState(State.LibraryLoaded);
            startSoundboard(adventures);
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
        const soundboard = SoundboardView({
            adventures: adventures,
            dropdown: <HTMLSelectElement> document.getElementById('adventure'),
            playScene: playScene,
            stopAllScenes: stopAllScenes,
            adventureSelected: (id:string) => selectAdventure(id)
        });
        selectAdventure(
            Storage.read().adventure ||
            R.sortBy(id => adventures[id].title, Object.keys(adventures))[0]
        );
        
        dom.on(document, 'keydown', (event:any):void => {
            playSceneWithHotkey(dom.key(event.keyCode));
        });
        
        dom.on(document, 'keypress', (event:any):void => {
            playSceneWithHotkey(dom.key(event.charCode));
        });
        
        function selectAdventure(id:string):void {
            const adventure = adventures[id];
            selectedAdventure = adventure;
            adventure.scenes.forEach((scene:any) => {
                const firstImage = scene.media.filter(m => m.type === 'image')[0];
                if (firstImage && !(firstImage.file in previews)) {
                    previews[firstImage.file] = queuePreviewDownload(() => {
                        return library.preview(firstImage.file);
                    })
                    .then((url:string) => soundboard.previewLoaded(firstImage.file, url));
                }
                
                const firstSound = scene.media.filter(m => m.type === 'sound')[0] || { tracks: [] };
                if (firstImage) {
                    loadFile(firstImage.file).then((url:string) => {
                        soundboard.fileLoaded(firstImage.file, url);
                    });
                }
                firstSound.tracks.forEach((t:any) => loadFile(t).then((url:string) => {
                    soundboard.fileLoaded(t, url);
                }));
            });
            soundboard.adventureSelected(id);
            Storage.modify(store => {
                store.adventure = id;
                return store;
            });
        }
        
        function playSceneWithHotkey(hotkey:any):void {
            if (!selectedAdventure) return;
            
            const scenes = selectedAdventure.scenes.filter((s:any) => s.key === hotkey);
            scenes.forEach(playScene);
        }
        
        function stopAllScenes():void {
            background([], latest.fade.background * 1000);
            foreground([], latest.fade.foreground * 1000);
        }
        
        function playScene(scene:any):void {
            const firstImage = scene.media.filter(m => m.type === 'image')[0];
            const firstSound = scene.media.filter(m => m.type === 'sound')[0] || { tracks: [] };
            Promise.all([
                firstImage ? loadFile(firstImage.file) : null,
                Promise.all(firstSound.tracks.map((t:any) => loadFile(t)))
            ])
            .then(files => {
                const imageFile = files[0];
                const soundFiles = files[1];
                const items:any[] = [];
                if (imageFile) {
                    items.push({
                        type: 'image',
                        url: imageFile,
                        style: {
                            backgroundSize: firstImage.size
                        }
                    });
                }
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
                layer(items, scene.fade.in * 1000);
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
            case State.LibraryLoaded: showPage('soundboard', 0.25); break;
            case State.SessionError:
                views.error.error(<Error> arg);
                showPage('session-error', 0.25);
                break;
            default: throw new Error('Unhandled state: ' + state);
        }
    }
});
