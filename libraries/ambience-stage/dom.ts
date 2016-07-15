export default function dom(container) {
    return {
        start: {
            scene: function(update) {
                const scene = document.createElement('div');
                scene.className = 'scene';
                container.appendChild(scene);
                let fading = false;
                return {
                    fade: {
                        start: () => {
                            fading = true;
                            requestAnimationFrame(updateIfFading);
                        },
                        step: opacity => {
                            scene.style.opacity = String(Math.min(opacity, 0.999));
                        },
                        stop: () => {
                            fading = false;
                        }
                    },
                    stop: () => {
                        container.removeChild(scene);
                    }
                };
                
                function updateIfFading() {
                    if (fading) {
                        update();
                        requestAnimationFrame(updateIfFading);
                    }
                }
            },
            image: function(image) {
                var element = document.createElement('div');
                element.style.backgroundImage = 'url(' + image.url + ')';
                element.className = 'image';
                const scene = container.lastElementChild;
                scene.appendChild(element);
                
                if ( image.style ) {
                    Object.keys(image.style).forEach(function(cssKey) {
                        var cssValue = image.style[cssKey];
                        element.style[cssKey] = cssValue;
                    });
                }
                
                return {
                    stop: function() {}
                };
            },
            sound: () => function() {},
            track: function(url, update) {
                var element = document.createElement('audio');
                element.src = url;
                if (container.querySelectorAll('audio').length === 0) {
                    element.volume = 0;
                }
                element.play();
                element.className = 'track';
                const scene = container.lastElementChild;
                scene.appendChild(element);
                
                element.addEventListener('timeupdate', update);
                element.addEventListener('ended', update);
                
                return {
                    stop: function() {
                        element.pause();
                        scene.removeChild(element);
                    },
                    fade: function(volume) {
                        element.volume = volume;
                    },
                    duration: () => element.duration * 1000
                };
            }
        },
        time: () => new Date()
    };
};
