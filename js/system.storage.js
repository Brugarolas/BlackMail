/**
 * Created by Andr�s on 19/04/2015.
 */

system.prototype.initStorage = function() {
    this.threadList = [];
    this.threadIds = {};
    this.threadLabels = {};
    this.labels = [];
}

system.prototype.setEmail = function(email) {
    this.email = email;
}

system.prototype.getLastDate = function() {
    return new Date(this.getThreadByIndex(0).date).add(-1).days();
}

system.prototype.saveThreads = function(email) {
    var threads = { 'list': this.threadList, 'ids': this.threadIds }

    var compressed = LZString.compress(JSON.stringify(threads));
    localStorage.setItem(email, compressed);

    for (i in this.threadList) {
        this.threadList[i].date = Date.parse(this.threadList[i].date);
    }

    return "Saving " + getSizeBytes(compressed.length * 16) + " of data...";
}

system.prototype.saveLabels = function(labels) {
    for (i in labels) {
        this.labels.push(labels[i]);
    }
}

system.prototype.getLabels = function() {
    return this.labels;
}

system.prototype.getLabel = function(id) {
    return this.labels[id];
}

system.prototype.getDefaultLabels = function() {
    if (!this.defaultLabels) {
        this.defaultLabels = [
            { 'id': 'INBOX', 'name': 'Inbox', 'unread': 0, 'class': 'fa-inbox', 'category': {'id': "CATEGORY_PERSONAL", 'name': "Personal", 'class': 'fa-envelope-square' } },
            { 'id': 'IMPORTANT', 'name': 'Important', 'class': 'fa-star' },
            { 'id': 'SENT', 'name': 'Sent', 'class': 'fa-paper-plane' },
            { 'id': 'DRAFT', 'name': 'Drafts', 'class': 'fa-file-text' },
            { 'id': 'TRASH', 'name': 'Trash', 'class': 'fa-trash' },
            { 'id': 'SPAM', 'name': 'Spam', 'class': 'fa-bolt ' }
        ];

        var personal = this.threadLabels['CATEGORY_PERSONAL'], thread;
        for (i in personal) {
            thread = this.getThreadByIndex(personal[i]);
            if (thread.labels.indexOf('UNREAD') > -1) {
                this.defaultLabels[0].unread += 1;
            }
        }
    }

    return this.defaultLabels;
}

system.prototype.getCategories = function() {
   var labels = [], categories = [], category = "CATEGORY_";
   for (i in this.labels) if (this.labels[i].id.indexOf(category) == 0) labels.push(this.labels[i].id);

   var sortedLabels = [
        { 'id': "CATEGORY_PERSONAL", 'name': "Personal", 'class': 'fa-envelope-square' },
        { 'id': "CATEGORY_SOCIAL", 'name': "Social", 'class': 'fa-users' },
        { 'id': "CATEGORY_PROMOTIONS", 'name': "Promotions", 'class': 'fa-tags' },
        { 'id': "CATEGORY_UPDATES", 'name': "Updates", 'class': 'fa-info-circle' },
        { 'id': "CATEGORY_FORUMS", 'name': "Forums", 'class': 'fa-comments' }
   ];

   for (i in sortedLabels) if (labels.indexOf(sortedLabels[i].id) > -1) categories.push(sortedLabels[i]);
   return categories;
}

system.prototype.retrieveThreads = function(email) {
    var item = localStorage.getItem(email);
    if (!item) return false;

    item = JSON.parse(LZString.decompress(item));
    if (!item) return false;

    this.threadList = item.list;
    this.threadIds = item.ids;
    return true;
}

system.prototype.classifyThreads = function() {
    for (i in this.labels) {
        this.threadLabels[this.labels[i].id] = [];
    }

    var thread;
    for (i in this.threadList) {
        thread = this.threadList[i];

        for (n in thread.labels) {
            this.threadLabels[thread.labels[n]].push(i);
        }
    }
}

system.prototype.addNewThreadsToList = function(threads) {
    for (i in threads) {
        this.threadList.push({id: threads[i].id});
        this.threadIds[threads[i].id] = this.threadList.length - 1;
    }
}

system.prototype.mergeThreadList = function(messages) {
    this.threadList = messages.concat(this.threadList);
    this.threadIds = {};

    for (i in this.threadList) {
        this.threadIds[this.threadList[i].id] = i;
    }

    if (messages.length > 0) this.newNotification(messages.length + " new messages.");
}

system.prototype.addMessagesToList = function(messages) {
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

system.prototype.addPageThreads = function(result) {
    for (i in result) setThreadMetadata(this.getThreadByIndex(i), result[i].result);
}

system.prototype.addMessageToThread = function(message) {
    var thread = this.threadList[this.threadIds[message.threadId]];
    updateThreadMetadata(thread, message);
}

system.prototype.getNumOfThreads = function(labelId) {
    if (!labelId) return this.threadList.length;
    else return this.threadLabels[labelId].length;
}

system.prototype.getThread = function(id) {
    return this.threadList[this.threadIds[id]];
}

system.prototype.getThreadByIndex = function(index, labelId) {
    if (!labelId) return this.threadList[index];
    else return this.threadList[this.threadLabels[labelId][index]];
}

system.prototype.getThreads = function(page, num, labelId) {
    var startingThread = page * num;
    if (!labelId) return this.threadList.slice(startingThread, startingThread + num);
    else {
        var threads = [], threadLabels = this.threadLabels[labelId].slice(startingThread, startingThread + num);
        for (i in threadLabels) {
            threads.push(this.threadList[threadLabels[i]]);
        }
        return threads;
    }
}