"use strict";
function createQueue(limit) {
    var waiting = [];
    var running = [];
    var timer = null;
    function add(task) {
        return new Promise(function (resolve, reject) {
            waiting.unshift({
                resolve: resolve,
                reject: reject,
                task: task
            });
            schedule();
        });
    }
    function schedule() {
        if (timer === null) {
            timer = setTimeout(execute, 0);
        }
    }
    function execute() {
        timer = null;
        var starting = waiting.slice(0, limit - running.length);
        starting.forEach(function (entry) {
            waiting.splice(waiting.indexOf(entry), 1);
            running.push(entry);
            entry.task()
                .then(function (x) {
                entry.resolve(x);
                complete();
            })
                .catch(function (e) {
                entry.reject(e);
                complete();
            });
            function complete() {
                running.splice(running.indexOf(entry), 1);
                schedule();
            }
        });
    }
    return add;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createQueue;
