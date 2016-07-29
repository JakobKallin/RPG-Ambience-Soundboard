export default function startSound(sound, outside) {
    const loop = 'loop' in sound ? sound.loop : true;
    const shuffle = 'shuffle' in sound ? sound.shuffle : true;
    const overlap = sound.overlap || 0;
    const shuffleArray = outside.shuffle || shuffleArrayRandomly;
    let volume = 0;
    
    let tracks = sound.tracks.slice();
    if (sound.tracks.length === 0) {
        throw new Error('Cannot start sound without tracks.');
    } 
    if (shuffle) {
        tracks = shuffleArray(tracks);
    }
    
    const soundHandle = outside.sound();
    const outsideTracks = [];
    let updateLatest = startTrack(0);
    
    const fadeSound = newVolume => {
        volume = newVolume;
        outsideTracks.forEach(t => t.fade(volume));
    };
    
    const stopSound = once(() => {
        outsideTracks.forEach(t => t.stop());
        soundHandle.stop();
    });
    
    return {
        fade: fadeSound,
        stop: stopSound,
        update: () => updateLatest()
    };
    
    function startTrack(index) {
        const startTime = outside.time();
        const outsideTrack = soundHandle.track(tracks[index]);
        outsideTrack.stop = once(outsideTrack.stop);
        outsideTracks.push(outsideTrack);
        outsideTrack.fade(volume);
        let updateNext = nothing;
        
        return function update():boolean {
            const currentTime = outside.time();
            const elapsed = currentTime - startTime;
            
            const duration = outsideTrack.duration();
            // Duration not known yet, so don't attempt any overlap until it is.
            if (isNaN(duration)) {
                return true;
            }
            
            if (elapsed >= duration) {
                outsideTrack.stop();
                remove(outsideTrack, outsideTracks);
            }
            
            if (elapsed >= duration - overlap && updateNext === nothing) {
                if ((index + 1) in tracks) {
                    updateNext = startTrack(index + 1);
                }
                else if (loop) {
                    if (shuffle) {
                        tracks = shuffleArray(tracks);
                    }
                    updateNext = startTrack(0);
                }
            }
            
            if (elapsed >= duration) {
                if (updateNext === nothing) {
                    stopSound();
                    return false;
                }
                else {
                    updateLatest = updateNext;
                }
            }
            
            return true;
        };
    }
    
    function nothing() {
        return true;
    }
    
    function once(callback) {
        const args = arguments;
        let called = false;
        return () => {
            if (!called) {
                called = true;
                callback.apply(undefined, args);
            }
        };
    }
};

function shuffleArrayRandomly(array) {
    const source = array.slice();
    const result = [];
    while (source.length > 0) {
        const index = randomInteger(source.length - 1);
        result.push(source[index]);
        source.splice(index, 1);
    }
    return result;
}

function randomInteger(max) {
    return Math.floor(Math.random() * (max + 1));
}

function remove(value, array) {
    array.splice(array.indexOf(value), 1);
}
