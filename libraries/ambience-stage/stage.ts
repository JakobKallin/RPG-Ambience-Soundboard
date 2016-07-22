import start from './scene';

export default function stage(outside) {
    let fadingOut = null;
    let fadingIn = null;
    let volume = 1;
    
    return {
        start: (items:any[], fadeInDuration=0) => {
            if (fadingOut) fadingOut.stop();
            fadingOut = fadingIn;
            if (fadingOut) fadingOut.stop(fadeInDuration);
            fadingIn = start(items, fadeInDuration, volume, outside);
        },
        volume: (newVolume:number) => {
            volume = newVolume;
            if (fadingOut) fadingOut.volume(newVolume);
            if (fadingIn) fadingIn.volume(newVolume);
        }
    }
    
    function nothing() {}
}
