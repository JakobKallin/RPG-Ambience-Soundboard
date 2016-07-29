export default function dom(container) {
    return {
        time: () => new Date().getTime(),
        scene: update => {
            const scene = document.createElement('div');
            scene.className = 'scene';
            container.appendChild(scene);
            const fading = {
                in: true,
                out: false
            };
            requestAnimationFrame(function frame() {
                if (fading.in) {
                    update();
                    requestAnimationFrame(frame);
                }
            });
            
            function step(opacity) {
                scene.style.opacity = String(Math.min(opacity, 0.999));
            }
            
            return {
                fade: {
                    in: {
                        step: step,
                        stop: () => fading.in = false
                    },
                    out: {
                        start: () => {
                            fading.out = true;
                            requestAnimationFrame(function frame() {
                                if (fading.out) {
                                    update();
                                    requestAnimationFrame(frame);
                                }
                            });
                        },
                        step: step
                    }
                },
                stop: () => {
                    container.removeChild(scene);
                    fading.out = false;
                },
                image: function(image) {
                    const element = document.createElement('img');
                    element.src = image.url;
                    element.className = 'image';
                    scene.appendChild(element);
                    
                    if (image.style) {
                        Object.keys(image.style).forEach(function(cssKey) {
                            const cssValue = image.style[cssKey];
                            element.style[cssKey] = cssValue;
                        });
                    }
                    
                    return {
                        stop: () => scene.removeChild(element)
                    };
                },
                sound: () => {
                    // Mobile Chrome (at least) only allows audio to be played
                    // as a direct result of user interaction, which means that
                    // overlap cannot trigger audio playback directly as it
                    // relies on non-interaction events. However, as soon as we
                    // call `play` on an audio element, we can trigger playback
                    // on that element later in any context. We thus create a
                    // pool of two audio elements that we then alternate between
                    // in order to support overlap.
                    const elements = {
                        busy: [],
                        idle: []
                    };
                    [0, 1].forEach(i => {
                        const element = document.createElement('audio');
                        element.play();
                        element.pause();
                        element.className = 'track';
                        elements.idle.push(element);
                    });

                    return {
                        stop: () => {},
                        track: url => {
                            const element = elements.idle.pop();
                            element.src = url;
                            element.className = 'track';
                            element.addEventListener('timeupdate', update);
                            scene.appendChild(element);
                            
                            element.play();
                            elements.busy.push(element);
                            
                            return {
                                stop: () => {
                                    element.pause();
                                    scene.removeChild(element);
                                    element.currentTime = 0;
                                    element.src = '';
                                    element.removeEventListener('timeupdate', update);
                                    
                                    elements.busy.splice(elements.busy.indexOf(element), 1);
                                    elements.idle.push(element);
                                },
                                fade: volume => {
                                    element.volume = volume;
                                },
                                duration: () => element.duration * 1000
                            };
                        }
                    };
                }
            };
        }
    };
};
