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

storage.prototype.setLastDate = function(email, date) {
    this.lastDate = new Date(date);
    //this.lastDate.add(-1).days();

    localStorage.setItem(email + '_date', this.lastDate);
}

storage.prototype.getLastDate = function() {
    return this.lastDate;
}

storage.prototype.saveThreads = function(email) {
    var threads = { 'list': this.threadList, 'ids': this.threadIds }

    var compressed = LZString.compress(JSON.stringify(threads));
    localStorage.setItem(email, compressed);

    return "Saving " + getSizeBytes(compressed.length * 16) + " of data...";
}

storage.prototype.retrieveThreads = function(email) {
    var item = localStorage.getItem(email);
    if (!item) return false;

    item = JSON.parse(LZString.decompress(item));
    if (!item) return false;

    this.threadList = item.list;
    this.threadIds = item.ids;
    this.lastDate = Date.parse(localStorage.getItem(email + '_date'));
    return true;
}

storage.prototype.addNewThreadsToList = function(threads) {
    for (i in threads) {
        this.threadList.push({id: threads[i].id});
        this.threadIds[threads[i].id] = this.threadList.length - 1;
    }
}

storage.prototype.addMessagesToList = function(messages) {
    var threadsAux = [];

    for (i in messages) {
        if (this.threadIds[messages[i].threadId] === undefined) {

            threadsAux.push({id: messages[i].threadId});
            //idsAux[threads[i].id] = threadsAux.length - 1;
        } else {
            var threadId = this.threadIds[messages[i].id];

            if (threadId == 0) {
                break;
            } else {
                threadsAux.push({id: messages[i].id});
                this.threads.splice(threadId, 1);
            }
        }
    }

    return threadsAux;
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

var storage = new storage();