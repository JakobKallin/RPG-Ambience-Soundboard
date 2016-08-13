import * as dom from '../document';
import * as ui from '../ui';

interface Callbacks {
    startSession: () => void,
    joinSession: (id:string) => void,
    dismiss: () => void
}

interface OnlinePlayView {
    joiningSession: () => void,
    sessionError: (url:string) => void,
    sessionJoined: (url:string) => void
}

export default function(dialog:HTMLElement, signal:Callbacks):OnlinePlayView {
    ui.dialog(dialog, () => {
        if (enterState['current'] === 'joining-session') {
            enterState('no-session');
        }
        signal.dismiss();
    });

    const enterState = dom.stateful(dialog, ['no-session', 'joining-session', 'connecting-to-session', 'session-active']);
    dom.on(dom.id('start-session-form'), 'submit', event => {
        event.preventDefault();
        enterState('connecting-to-session');
        signal.startSession();
    });
    dom.on(dom.id('join-session-form'), 'submit', event => {
        event.preventDefault();
        enterState('joining-session');
    });
    const joinSessionIdForm = dom.id('join-session-id-form');
    dom.on(joinSessionIdForm, 'submit', event => {
        event.preventDefault();
        const url = (<HTMLInputElement> dom.first('input', joinSessionIdForm)).value;
        const id = idFromUrl(url);
        enterState('connecting-to-session');
        signal.joinSession(id);
    });

    return {
        joiningSession: () => {
            enterState('connecting-to-session');
        },
        sessionError: message => {
            enterState('no-session');
            dom.id('online-play-error').hidden = false;
            dom.id('online-play-error-message').textContent = message;
        },
        sessionJoined: url => {
            enterState('session-active');
            const link = <HTMLAnchorElement> dom.id('join-session-link');
            link.href = link.textContent = url;
        }
    };
}

function idFromUrl(url:string):string {
    try {
        const marker = 'session=';
        const id = url.substring(url.indexOf(marker) + marker.length);
        return id;
    }
    catch(error) {
        return url;
    }
}
