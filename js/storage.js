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
    this.labels = {};
}

storage.prototype.setEmail = function(email) {
    this.email = email;
}

storage.prototype.checkLastDate = function() {
    this.lastDate = new Date(this.getThreadByIndex(0).date);
    this.lastDate.add(-1).days();

    localStorage.setItem(this.email + '_date', this.lastDate);
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

storage.prototype.saveLabels = function(labels) {
    //TODO Guardar
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

storage.prototype.mergeThreadList = function(messages) {
    this.threadList = messages.concat(this.threadList);
    this.threadIds = {};

    for (i in this.threadList) {
        this.threadIds[this.threadList[i].id] = i;
    }

    notificationSystem.newNotification(messages.length + " new messages.");
}

storage.prototype.addMessagesToList = function(messages) {
    var threadsAux = [];

    for (i in messages) {
        console.log(messages[i]);

        if (this.threadIds[messages[i].threadId] === undefined) {
            threadsAux.push({id: messages[i].threadId});
        } else {
            var threadIndex = this.threadIds[messages[i].threadId];

            if (threadIndex == 0) {
                break;
            } else {
                threadsAux.push({id: messages[i].threadId});
                this.threadList.splice(threadIndex, 1);
            }
        }
    }

    return threadsAux;
}

storage.prototype.addPageThreads = function(result) {
    for (i in result) setThreadMetadata(this.getThreadByIndex(i), result[i].result);
}

storage.prototype.addMessageToThread = function(message) {
    var thread = this.threadList[this.threadIds[message.threadId]];
    updateThreadMetadata(thread, message);
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

storage.prototype.getThreads = function(page, num) {
    var startingThread = page * num;
    return this.threadList.slice(startingThread, startingThread + num);
}

var storage = new storage();