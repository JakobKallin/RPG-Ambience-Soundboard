import start from './scene';
declare var R:any;

export default function stage(outside) {
    let fadingOut = null;
    let fadingIn = null;
    let volume = 1;

    return {
        start: (items:any[], fadeInDuration=0):Promise<any> => {
            return new Promise((resolve, reject) => {
                const callbacks = wrapCallbacks(outside, resolve);
                if (fadingOut) fadingOut.stop();
                fadingOut = fadingIn;
                if (fadingOut) fadingOut.stop(fadeInDuration);
                fadingIn = start(items, fadeInDuration, volume, callbacks);
            });
        },
        volume: (newVolume:number) => {
            volume = newVolume;
            if (fadingOut) fadingOut.volume(newVolume);
            if (fadingIn) fadingIn.volume(newVolume);
        }
    };

    function nothing() {}
}

function postprocess(f:Function, callback:Function) {
    return function() {
        const args = arguments;
        const result = f.apply(undefined, arguments);
        callback(result);
        return result;
    }
}

function wrapCallbacks(originalCallbacks, resolve) {
    const callbacks = R.clone(originalCallbacks);
    callbacks.scene = postprocess(callbacks.scene, sceneCallbacks => {
        sceneCallbacks.stop = postprocess(sceneCallbacks.stop, () => {
            resolve();
        });
    });
    return callbacks;
}
