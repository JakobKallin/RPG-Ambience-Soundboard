'use strict';

var http = require('http');

var clients = [];

//Create a server
http.createServer(function(request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    response.setHeader('Content-Type', 'text/event-stream');
    
    console.log(request.method + ' ' + request.url);
    
    if (request.method === 'GET') {
        sendEventsTo(response);
        request.on('close', function() {
            stopSendingEventsTo(response);
            console.log('Connection closed');
        });
    }
    else if (request.method === 'POST') {
        var message = decodeURI(request.url.substring(1));
        broadcast(message);
        response.end();
        console.log('Done with POST');
    }
    else if (request.method === 'DELETE') {
        broadcast('', 'stop')
        response.end();
        console.log('Done with DELETE');
    }
    else {
        response.end();
    }
}).listen(12345);

setInterval(broadcastPing, 10 * 1000);

function sendEventsTo(response) {
    clients.push(response);
}

function stopSendingEventsTo(response) {
    clients.splice(clients.indexOf(response), 1);
}

function broadcast(unsafeMessage, type) {
    const message = unsafeMessage.replace(/\n/g, '');
    clients.forEach(function(response, i) {
        console.log('Sending ' + message + (type ? ' (' + type + ')' : '') + ' to ' + i);
        if (type) {
            response.write('event: ' + type + '\n');
        }
        response.write('data: ' + message + '\n\n')
    });
}

function broadcastPing() {
    clients.forEach(function(response, i) {
        console.log('Sending ping to ' + i);
        response.write(': ping\n\n');
    });
}
