/**
 * Created by Andrés on 19/04/2015.
 */

function storage() {
    //Detect platform
    this.platform = (typeof process !== "undefined" && typeof require !== "undefined") ? "Node" : "Anything";
    if (this.platform == "Node") {
        this.platform = (typeof require('nw.gui') !== "undefined") ? "Node Webkit" : "Node.js";
    }

    this.threadList = [];
    this.threadIds = {};
}

storage.prototype.saveThreads = function(email) {
    var threads = { 'list': this.threadList, 'ids': this.threadIds }

    //var string = JSON.stringify(threads);
    //console.log("Size of sample is " + getSizeBytes(string.length * 16));
    var compressed = LZString.compress(JSON.stringify(threads));
    localStorage.setItem(email, compressed);

    return "Saving " + getSizeBytes(compressed.length * 16) + " of data...";
}

storage.prototype.retrieveThreads = function(email) {
    var item = localStorage.getItem(email);
    if (item) {
        item = JSON.parse(LZString.decompress(item));
        this.threadList = item.list;
        this.threadIds = item.ids;
        return true;
    } else return false;
}

storage.prototype.addNewThreadsToList = function(threads) {
    for (i in threads) {
        this.threadList.push({id: threads[i].id});
        this.threadIds[threads[i].id] = this.threadList.length - 1;
    }
}

storage.prototype.addAndCheckThreadsToList = function(threads) {
    var threadsAux = [];

    for (i in threads) {
        //console.log(threads[i].id);

        if (this.threadIds[threads[i].id] === undefined) {
            threadsAux.push({id: threads[i].id});
            //idsAux[threads[i].id] = threadsAux.length - 1;
        } else {
            var threadId = this.threadIds[threads[i].id];

            if (threadId == 0) {
                return threadsAux;
            } else {
                threadsAux.push({id: threads[i].id});
                this.threads.splice(threadId, 1);
            }
        }
    }
}

storage.prototype.getNumOfThreads = function() {
    return this.threadList.length;
}

storage.prototype.getThread = function(id) {
    return this.threadList[this.threadIds[id]];
}

storage.prototype.getThreadByIndex = function(index) {
    return this.threadList[index];
}

storage.prototype.getThreads = function(start, num) {
    return this.threadList.slice(start, start + num);
}