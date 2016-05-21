export default function startSound(sound, outside, abortSceneIfSoundOnly) {
    var loop = 'loop' in sound ? sound.loop : true;
    var shuffle = 'shuffle' in sound ? sound.shuffle : true;
    var overlap = sound.overlap || 0;
    var shuffleArray = outside.shuffle || function(x) { return x; };
    
    var tracks = sound.tracks.slice();
    if ( sound.tracks.length === 0 ) {
        throw new Error('Cannot start sound without tracks.');
    } 
    if ( shuffle ) {
        tracks = shuffleArray(tracks);
    }
    
    const stopOutsideSound = outside.start.sound ? outside.start.sound() : nothing;
    const outsideTracks = [];
    var updateLatest = startTrack(0);
    
    const fadeSound = ratio => {
        outsideTracks.forEach(t => t.fade(ratio));
    };
    
    const stopSound = once(() => {
        outsideTracks.forEach(t => t.stop());
        stopOutsideSound();
        abortSceneIfSoundOnly();
    });
    
    return {
        fade: fadeSound,
        stop: stopSound,
        update: () => updateLatest()
    };
    
    function startTrack(index) {
        var startTime = outside.time();
        const outsideTrack = outside.start.track(tracks[index]);
        outsideTrack.stop = once(outsideTrack.stop);
        outsideTracks.push(outsideTrack);
        var updateNext = nothing;
        
        return function update() {
            var currentTime = outside.time();
            var elapsed = currentTime - startTime;
            
            const duration = outsideTrack.duration();
            // Duration not known yet, so don't attempt any overlap until it is.
            if (isNaN(duration)) {
                return;
            }
            
            if ( elapsed >= duration ) {
                outsideTrack.stop();
                outsideTracks.splice(outsideTracks.indexOf(outsideTrack, 1));
            }
            
            if ( elapsed >= duration - overlap && updateNext === nothing ) {
                if ( (index + 1) in tracks ) {
                    updateNext = startTrack(index + 1);
                }
                else if ( loop ) {
                    if ( shuffle ) {
                        tracks = shuffleArray(tracks);
                    }
                    updateNext = startTrack(0);
                }
            }
            
            if (elapsed >= duration) {
                if (updateNext === nothing) {
                    stopSound();
                }
                else {
                    updateLatest = updateNext;
                }
            }
        };
    }
    
    function nothing() {}
    
    function once(callback) {
        let called = false;
        return () => {
            if (!called) {
                called = true;
                callback.apply(undefined, arguments);
            }
        };
    }
};
