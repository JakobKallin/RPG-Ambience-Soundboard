import Library from './adventure/library';
import GoogleDrive from './storage/google-drive';
import LoadingLibraryView from './views/loading-library';
import SoundboardView from './views/soundboard';
import GoogleDriveView from './views/google-drive';
import * as dom from './document';
import AmbienceStage from '../libraries/ambience-stage/stage';
import AmbienceStageDOM from '../libraries/ambience-stage/dom';
import { State, transitions } from './state-machine';
declare var R:any;

dom.on(window, 'DOMContentLoaded', () => {
    let state:State = State.Loading;
    stateEntered(state);
    
    const appId = '907013371139';
    const library = Library(GoogleDrive(appId));
    
    const views = {
        googleDrive: GoogleDriveView(dom.id('google-drive'), {
            login: () => {
                enterState(State.StartingSession);
                library.authenticate(false)
                .then(loadLibrary)
                .catch(() => enterState(State.SessionError))
            }
        }),
        loadingLibrary: LoadingLibraryView(dom.id('loading-library'))
    };
    
    enterState(State.AccountPossiblyConnected);
    
    function showPage(id:string, fade:number=0):void {
        const pages = dom.all('.page');
        dom.all('.page').forEach((p:any) => {
            if (p.id === id) {
                // Make sure the target page is at the bottom, so that pages
                // fading out will actually be visible.
                document.body.insertBefore(p, R.last(pages));
                p.hidden = false;
            }
            else if (!p.hidden) {
                fadeOut(p, fade);
            }
        });
        
        function fadeOut(node:HTMLElement, duration:number):void {
            node.style.transitionProperty = 'opacity';
            node.style.transitionDuration = duration + 's';
            node.style.opacity = '0';
            
            setTimeout(() => {
                node.style.transitionProperty = '';
                node.style.transitionDuration = '';
                node.style.opacity = '';
                node.hidden = true;
                document.body.insertBefore(node, pages[0]);
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
        .catch(e => enterState(State.SessionError));
    }
    
    let selectedAdventure:any = null;
    function startSoundboard(adventures:any[]):void {
        const previews = {};
        const files = {};
        const loadFile = R.memoize((id:string) => {
            return new Promise((resolve, reject) => {
                // Immediate timeout because this is actually called before
                // `SoundboardView` returns, so we don't have the soundboard
                // callbacks available to us.
                setTimeout(() => {
                    soundboard.fileProgress(id, 0);
                    return library.download(id, (ratio:number) => soundboard.fileProgress(id, ratio))
                    .then(resolve)
                    .catch(reject);
                }, 0);
            });
        });
        
        const background = AmbienceStage(AmbienceStageDOM(dom.id('background')));
        const foreground = AmbienceStage(AmbienceStageDOM(dom.id('foreground')));
        const soundboard = SoundboardView({
            adventures: adventures,
            dropdown: document.getElementById('adventure'),
            playScene: playScene,
            stopAllScenes: stopAllScenes,
            adventureSelected: (id:string) => {
                const adventure = adventures[id];
                selectedAdventure = adventure;
                adventure.scenes.forEach((scene:any) => {
                    if (scene.image.file && !(scene.image.file.id in previews)) {
                        previews[scene.image.file.id] = library.preview(scene.image.file.id)
                        .then((url:string) => soundboard.previewLoaded(scene.image.file.id, url));
                    }
                    
                    scene.sound.tracks.forEach((t:any) => loadFile(t.id).then((url:string) => {
                        soundboard.fileLoaded(t.id, url);
                    }));
                });
            }
        });
        
        dom.on(document, 'keydown', (event:any) => {
            playSceneWithHotkey(dom.key(event.keyCode));
        });
        
        dom.on(document, 'keypress', (event:any) => {
            playSceneWithHotkey(dom.key(event.charCode));
        });
        
        function playSceneWithHotkey(hotkey:any):void {
            if (!selectedAdventure) return;
            
            const scenes = selectedAdventure.scenes.filter((s:any) => s.key === hotkey);
            scenes.forEach(playScene);
        }
        
        function stopAllScenes():void {
            background([], 0);
            foreground([], 0);
        }
        
        function playScene(scene:any):void {
            Promise.all([
                scene.image.file ? loadFile(scene.image.file.id) : null,
                Promise.all(scene.sound.tracks.map((t:any) => loadFile(t.id)))
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
                            backgroundSize: scene.image.size
                        }
                    });
                }
                if (soundFiles.length > 0) {
                    items.push({
                        type: 'sound',
                        tracks: soundFiles,
                        loop: scene.sound.loop,
                        overlap: scene.sound.overlap * 1000,
                        shuffle: scene.sound.shuffle,
                        volume: scene.sound.volume / 100
                    });
                }
                
                const layer = scene.layer === 'foreground' ? foreground : background;
                layer(items, scene.fade.duration * 1000);
            });
        }
    }
    
    function attemptImmediateLogin():void {
        library.authenticate(true)
        .then(() => enterState(State.AccountConnected))
        .catch(() => enterState(State.AccountNotConnected));
    }
    
    function enterState(newState:State):void {
        if (R.contains(newState, transitions(state))) {
            state = newState;
            stateEntered(newState);
        }
        else {
            throw new Error('Invalid state transition: ' + state + ' to ' + newState);
        }
    }
    
    function stateEntered(state:State):void {
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
            default: throw new Error('Unhandled state: ' + state);
        }
    }
});
