import startSound from './sound.js';

export default function startScene(items, fadeInDuration, outside) {
    fadeInDuration = fadeInDuration || 0;
    var startTime = outside.time();
    var hasEnded = false;
    var handles = [];
    var sceneHandle;
    
    var updateFade = function updateFadeIn() {
        var ratio = fadeRatio(startTime, outside.time(), fadeInDuration);
        sceneHandle.fade.step(ratio);
        handles.forEach(function(handle) {
            if (handle.fade) handle.fade(ratio);
        });
        
        if ( ratio === 1 ) {
            sceneHandle.fade.stop();
            updateFade = nothing;
        }
    };
        
    function start(items, fadeInDuration, outside) {
        sceneHandle = outside.start.scene ? outside.start.scene(update) : {};
        sceneHandle = sceneHandle || {};
        sceneHandle.stop = sceneHandle.stop || nothing;
        sceneHandle.fade = sceneHandle.fade || {};
        sceneHandle.fade.start = sceneHandle.fade.start || nothing;
        sceneHandle.fade.step = sceneHandle.fade.step || nothing;
        sceneHandle.fade.stop = sceneHandle.fade.stop || nothing;
        
        sceneHandle.fade.start();
        
        handles = items.map(function(item) {
            if ( item.type === 'sound' ) {
                return startSound(item, outside, () => {
                    if (onlySound(items)) end();
                });
            }
            else {
                return outside.start[item.type](item, update);
            }
        });
        
        return stop;
    }
    
    function onlySound(items) {
        return items.every(i => i.type === 'sound');
    }
    
    // function stopSceneAfterwards(startSound) {
    //     var startSound = startSound || constant(nothing);
    //     return function() {
    //         var stopSound = startSound();
    //         let soundStopped = false;
    //         return function() {
    //             // Once `stop` is called below, all of the stop handles will be
    //             // called in turn, which includes this very function. We thus
    //             // prevent it from being called twice.
    //             if (!soundStopped) {
    //                 soundStopped = true;
    //                 stopSound();
    //                 stop(0);
    //             }
    //         };
    //     };
    // }
    
    function update() {
        handles.forEach(function(handle) {
            if ( handle.update ) {
                handle.update();
            }
        });
        updateFade();
    }
    
    const stop = once(fadeOutDuration => {
        const stopTime = outside.time();
        updateFade = function updateFadeOut() {
            var ratio = 1 - fadeRatio(stopTime, outside.time(), fadeOutDuration);
            sceneHandle.fade.step(ratio);
            handles.forEach(function(handle) {
                if (handle.fade) handle.fade(ratio);
            });
            
            if ( ratio === 0 ) {
                end();
            }
        };
        sceneHandle.fade.start();
        
        if ( fadeOutDuration === 0 ) {
            end();
        }
        
        return end;
    });
    
    function end() {
        if ( !hasEnded ) {
            hasEnded = true;
            updateFade = nothing;
            handles.forEach(function(handle) {
                handle.stop();
            });
            sceneHandle.fade.stop();
            sceneHandle.stop();
        }
    }
    
    function fadeRatio(startTime, currentTime, duration) {
        var elapsed = currentTime - startTime;
        if ( duration === 0 ) {
            return 1;
        }
        else {
            var ratio = elapsed / duration;
            var boundedRatio = Math.min(Math.max(ratio, 0), 1);
            return boundedRatio;
        }
    }
    
    function nothing() {}
    
    function constant(value) {
        return function() {
            return value;
        };
    }
    
    function once(callback) {
        let called = false;
        let result = null;
        return function() {
            if (!called) {
                called = true;
                result = callback.apply(undefined, arguments);
            }
            return result;
        };
    }
    
    return start(items, fadeInDuration, outside);
};
