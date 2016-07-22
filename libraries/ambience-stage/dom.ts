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
                sound: () => ({
                    stop: () => {},
                    track: url => {
                        const element = document.createElement('audio');
                        element.src = url;
                        element.play();
                        element.className = 'track';
                        scene.appendChild(element);
                        
                        element.addEventListener('timeupdate', update);
                        
                        return {
                            stop: () => {
                                element.pause();
                                scene.removeChild(element);
                            },
                            fade: volume => {
                                element.volume = volume;
                            },
                            duration: () => element.duration * 1000
                        };
                    }
                })
            };
        }
    };
};
