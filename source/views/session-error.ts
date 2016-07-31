import * as dom from '../document';

interface Callbacks {
    retry: () => void
}

interface SessionErrorView {
    error: (Error) => void
}

export default function(page:HTMLElement, signal:Callbacks):SessionErrorView {
    function showError(message:string) {
        dom.id('session-error-detail').textContent = message;
    }

    showError('');

    dom.on(dom.first('form', page), 'submit', event => {
        event.preventDefault();
        signal.retry();
    });

    return {
        error: error => showError(error.message)
    };
}
