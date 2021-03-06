export default function createQueue(limit) {
    const waiting = [];
    const running = [];
    let timer = null;

    function add(task:() => Promise<any>):Promise<any> {
        return new Promise((resolve, reject) => {
            waiting.unshift({
                resolve: resolve,
                reject: reject,
                task: task
            });
            schedule();
        });
    }

    function schedule() {
        if ( timer === null ) {
            timer = setTimeout(execute, 0);
        }
    }

    function execute() {
        timer = null;
        const starting = waiting.slice(0, limit - running.length);
        starting.forEach(entry => {
            waiting.splice(waiting.indexOf(entry), 1);
            running.push(entry);

            entry.task()
            .then((x) => {
                entry.resolve(x);
                complete();
            })
            .catch((e) => {
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
