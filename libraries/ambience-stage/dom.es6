export default function dom(container) {
    let number = 0;
    return {
        start: {
            scene: function(update) {
                const scene = document.createElement('div');
                scene.className = 'scene';
                container.appendChild(scene);
                number += 1;
                const sceneNumber = number;
                let fading = false;
                return {
                    fade: {
                        start: () => {
                            console.log('starting fade of scene ' + sceneNumber);
                            fading = true;
                            requestAnimationFrame(updateIfFading);
                        },
                        step: opacity => {
                            scene.style.opacity = Math.min(opacity, 0.999);
                            console.log('fading opacity ' + opacity);
                        },
                        stop: () => {
                            console.log('stopping fade of scene ' + sceneNumber);
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
                element.play();
                element.className = 'track';
                const scene = container.lastElementChild;
                scene.appendChild(element);
                
                element.addEventListener('timeupdate', update);
                
                return {
                    stop: function() {
                        element.pause();
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
