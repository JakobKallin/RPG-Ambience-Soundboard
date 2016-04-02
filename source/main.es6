import Library from './adventure/library.js';
import GoogleDrive from './storage/google-drive.js';
import SoundboardView from './views/soundboard.js';
import * as dom from './dom.js';

window.addEventListener('DOMContentLoaded', () => {
    const library = Library(GoogleDrive('907013371139'));
    showPage('loading');
    library.list().then(function(adventures) {
        SoundboardView({
            adventures: adventures,
            dropdown: document.getElementById('adventure'),
            playSound: function(url) {
                new Audio('/boom.wav').play();
            },
            library: library
        });
        showPage('soundboard'); 
    });
    
    function showPage(id) {
        dom.all('.page').forEach(p => {
            p.hidden = p.id !== id;
        });
    }
});
