import start from './scene.js';

export default function stage(outside) {
    var abort = nothing;
    var stop = function() {
        return nothing;
    };
    
    return function(items, fadeInDuration) {
        abort();
        abort = stop(fadeInDuration);
        stop = start(items, fadeInDuration, outside);
    }
    
    function nothing() {}
}
