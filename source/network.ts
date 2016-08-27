export interface Session {
    id:string,
    trigger:(any) => void
}

interface Callbacks {
    event:(value:any) => void,
    peerCountChanged:(number) => void
}

export default function(session:string, signal:Callbacks):Promise<Session> {
    return new Promise((resolve, reject) => {
        // As with the session ID, this is not intended to be secure.
        const self = Date.now().toString(36) + Math.random().toString(36).replace(/\./g, '').substring(0, 8);
        const peers = [self];
        peerCountChanged();
        const socket = new WebSocket('wss://tabletopsoftware.herokuapp.com/' + session);
        let paused = false;

        socket.onopen = event => {
            resolve({
                id: session,
                trigger: event => {
                    sendMessage(event);
                }
            });
            sendMessage({ type: 'ping' });
            setInterval(() => {
                sendMessage({ type: 'ping' });
            }, 10 * 1000);
        };

        socket.onerror = event => {
            reject(event);
        };

        socket.onmessage = event => {
            const message = JSON.parse(event.data);
            if (message.sender === self) return;

            const payload = message.payload;
            if (payload.type === 'ping') {
                if (peers.indexOf(message.sender) === -1) {
                    peers.push(message.sender);
                    sendMessage({ type: 'ping' });
                    scheduleRemoval(message.sender);
                }
                peerCountChanged();
            }
            else if (payload.type === 'leave') {
                removePeer(message.sender);
                peerCountChanged();
            }
            else {
                // Categorically disallow messages to be sent while an event is
                // being processed, in order to avoid infinite message loops.
                paused = true;
                try {
                    signal.event(payload);
                }
                finally {
                    paused = false;
                }
            }
        };

        window.addEventListener('beforeunload', () => {
            sendMessage({ type: 'leave' });
        });

        function peerCountChanged() {
            signal.peerCountChanged(peers.length);
        }

        function sendMessage(payload) {
            if (paused) return;

            const message = {
                sender: self,
                payload: payload
            };
            socket.send(JSON.stringify(message));
        }

        const removeTimers = {};
        function scheduleRemoval(peer) {
            if (removeTimers[peer]) {
                clearTimeout(removeTimers[peer]);
            }
            removeTimers[peer] = setTimeout(() => {
                removePeer(peer);
            }, 20 * 1000);
        }

        function removePeer(peer) {
            if (peers.indexOf(peer) !== -1) {
                peers.splice(peers.indexOf(peer), 1);
            }
            delete removeTimers[peer];
        }
    });
}
