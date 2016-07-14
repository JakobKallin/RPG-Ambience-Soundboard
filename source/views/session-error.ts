import * as dom from '../document';

interface SessionErrorView {
    error: (Error) => void
}

export default function(page:HTMLElement):SessionErrorView {
    function showError(message:string) {
        dom.id('session-error-detail').textContent = message;
    }
    
    showError('');
    
    return {
        error: error => showError(error.message)
    };
}
