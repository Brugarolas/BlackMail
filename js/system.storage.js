/**
 * Created by Andrés on 19/04/2015.
 */

system.prototype.initStorage = function () {
    this.threadList = [];
    this.threadIds = {};
    this.threadLabels = {};
    this.labels = [];
}

system.prototype.setEmail = function (email) {
    this.email = email;
}

system.prototype.getLastDate = function () {
    return new Date(this.getThreadByIndex(0).date).add(-1).days();
}

system.prototype.saveThreads = function () {
    var threads = {'list': this.threadList, 'ids': this.threadIds}

    //var compressed = LZString.compress(JSON.stringify(threads));
    var compressed = LZString.compress(angular.toJson(threads, false));
    localStorage.setItem(this.email, compressed);

    for (i in this.threadList) {
        this.threadList[i].date = new Date(this.threadList[i].date);
    }

    return "Saving " + getSizeBytes(compressed.length * 16) + " of data...";
}

system.prototype.saveLabels = function (labels) {
    for (i in labels) this.labels.push(labels[i]);
}

system.prototype.getLabels = function () {
    return this.labels;
}

system.prototype.getLabel = function (id) {
    return this.labels[id];
}

system.prototype.getCategories = function () {
    var labels = [], categories = [], category = "CATEGORY_";
    for (i in this.labels) if (this.labels[i].id.indexOf(category) == 0) labels.push(this.labels[i].id);

    var sortedLabels = [
        {'id': "CATEGORY_PERSONAL", 'name': "Personal", 'class': 'fa-envelope-square'},
        {'id': "CATEGORY_SOCIAL", 'name': "Social", 'class': 'fa-users'},
        {'id': "CATEGORY_PROMOTIONS", 'name': "Promotions", 'class': 'fa-tags'},
        {'id': "CATEGORY_UPDATES", 'name': "Updates", 'class': 'fa-info-circle'},
        {'id': "CATEGORY_FORUMS", 'name': "Forums", 'class': 'fa-comments'}
    ];

    for (i in sortedLabels) if (labels.indexOf(sortedLabels[i].id) > -1) categories.push(sortedLabels[i]);
    return categories;
}

system.prototype.retrieveThreads = function (email) {
    var item = localStorage.getItem(email);
    if (!item) return false;

    item = JSON.parse(LZString.decompress(item));
    if (!item) return false;

    this.threadList = item.list;
    this.threadIds = item.ids;
    return true;
}

system.prototype.classifyThreads = function () {
    /* First, we classify only default labels */
    var defaultLabels = this.getDefaultLabels(), thread, categories = this.getCategories();
    for (i in defaultLabels) this.threadLabels[defaultLabels[i].id] = [];

    for (i in this.threadList) {
        thread = this.threadList[i];

        if (thread.labels.indexOf('TRASH') > -1) this.threadLabels['TRASH'].push(i);
        else if (thread.labels.indexOf('SPAM') > -1) this.threadLabels['SPAM'].push(i);
        else for (n in thread.labels) if (thread.labels[n] in this.threadLabels) this.threadLabels[thread.labels[n]].push(i);
    }

    /* Then, we classify categories from Inbox threads (so we don't see a deleted thread) */
    for (i in categories) this.threadLabels[categories[i].id] = [];

    var inboxLabels = this.threadLabels['INBOX'], hasCategories;
    for (i in inboxLabels) {
        hasCategories = false;
        thread = this.threadList[inboxLabels[i]];

        for (n in thread.labels) if (thread.labels[n].indexOf('CATEGORY_') == 0) {
            hasCategories = true;
            this.threadLabels[thread.labels[n]].push(inboxLabels[i]);
        }

        /* If message don't have a category, it will be in personal category */
        if (!hasCategories) this.threadLabels['CATEGORY_PERSONAL'].push(inboxLabels[i]);
    }

    /* Count unread personal messages */
    this.countUnread();
}

system.prototype.countUnread = function() {
    /* Count unread personal messages */
    var personal = this.threadLabels['CATEGORY_PERSONAL'];
    this.defaultLabels[0].unread = 0;
    for (i in personal) {
        thread = this.getThreadByIndex(personal[i]);
        if (thread.labels.indexOf('UNREAD') > -1) this.defaultLabels[0].unread += 1;
    }
}

system.prototype.getDefaultLabels = function () {
    if (!this.defaultLabels) {
        this.defaultLabels = [
            {
                'id': 'INBOX', 'name': 'Inbox', 'unread': 0, 'class': 'fa-inbox',
                'category': {'id': "CATEGORY_PERSONAL", 'name': "Personal", 'class': 'fa-envelope-square'}
            },
            {'id': 'IMPORTANT', 'name': 'Important', 'class': 'fa-star'},
            {'id': 'SENT', 'name': 'Sent', 'class': 'fa-paper-plane'},
            {'id': 'DRAFT', 'name': 'Drafts', 'class': 'fa-file-text'},
            {'id': 'TRASH', 'name': 'Trash', 'class': 'fa-trash'},
            {'id': 'SPAM', 'name': 'Spam', 'class': 'fa-bolt '}
        ];
    }

    return this.defaultLabels;
}

system.prototype.addNewThreadsToList = function (threads) {
    for (i in threads) {
        this.threadList.push({id: threads[i].id});
        this.threadIds[threads[i].id] = this.threadList.length - 1;
    }
}

system.prototype.addNewThreadToListSorted = function (thread) {
    var index = 0, actualThread;
    for (i in this.threadList) {
        actualThread = this.threadList[i];
        if (Date.compare(thread.date, actualThread.date) == 1) {
            index = i; break;
        }
    }

    this.threadList.splice(index, 0, thread);
}

system.prototype.sortThreadIds = function () {
    for (i in this.threadList) this.threadIds[this.threadList[i].id] = i;
}

system.prototype.mergeThreadList = function (messages) {
    this.threadList = messages.concat(this.threadList);
    this.threadIds = {};

    for (i in this.threadList) this.threadIds[this.threadList[i].id] = i;

    if (messages.length > 0) this.newNotification(messages.length + " new messages.");
}

system.prototype.addMessagesToList = function (messages) {
    var threadsAux = [];

    for (i in messages) {
        console.log(messages[i]);

        if (this.threadIds[messages[i].threadId] === undefined) threadsAux.push({id: messages[i].threadId});
        else {
            var threadIndex = this.threadIds[messages[i].threadId];

            if (threadIndex == 0) break;
            else {
                threadsAux.push({id: messages[i].threadId});
                this.threadList.splice(threadIndex, 1);
            }
        }
    }

    return threadsAux;
}

system.prototype.addOrUpdateThread = function (result) {
    var index = this.threadIds[result.id], thread = { id: result.id };
    if (index !== undefined) this.threadList.splice(index, 1);

    setThreadMetadata(thread, result);
    this.addNewThreadToListSorted(thread);
    this.sortThreadIds();
    this.saveThreads();
    this.classifyThreads();
}

system.prototype.updateLabels = function (response) {
    var thread;
    for (i in response) {
        thread = this.threadList[this.threadIds[response[i].result.id]];
        thread.labels = getThreadLabels(response[i].result);
    }
    this.saveThreads()
    this.classifyThreads();
}

system.prototype.addPageThreads = function (result) {
    for (i in result) setThreadMetadata(this.getThreadByIndex(i), result[i].result);
}

system.prototype.addMessageToThread = function (message) {
    var thread = this.threadList[this.threadIds[message.threadId]];
    updateThreadMetadata(thread, message);
}

system.prototype.getNumOfThreads = function (labelId) {
    if (!labelId) return this.threadList.length;
    else return this.threadLabels[labelId].length;
}

system.prototype.getThread = function (id) {
    return this.threadList[this.threadIds[id]];
}

system.prototype.getThreadByIndex = function (index, labelId) {
    if (!labelId) return this.threadList[index];
    else return this.threadList[this.threadLabels[labelId][index]];
}

system.prototype.getThreads = function (page, num, labelId) {
    var startingThread = page * num;
    if (!labelId) return this.threadList.slice(startingThread, startingThread + num);
    else {
        var threads = [], threadLabels = this.threadLabels[labelId].slice(startingThread, startingThread + num);
        for (i in threadLabels) threads.push(this.threadList[threadLabels[i]]);
        return threads;
    }
}