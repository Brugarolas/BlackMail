/**
 * Created by Andrés on 19/04/2015.
 */
"use strict";

function storage () {
    this.threadList = [];
    this.threadIds = {};
    this.threadLabels = {};
    this.labels = [];
    this.attachmentList = [];
    this.attachmentIds = {};
}

storage.prototype.savePersonalData = function (result, imageSize) {
    this.personal = {
        email: result.emails[0].value,
        name: result.displayName || this.personal.email.substring(0, this.personal.email.indexOf('@')),
        photo: result.image.url.slice(0, result.image.url.indexOf('?sz')) + '?sz=' + imageSize
    }
}

storage.prototype.getPersonalData = function () {
    return this.personal;
}

storage.prototype.getEmail = function () {
    return (this.personal) ? this.personal.email : undefined;
}

storage.prototype.saveLabels = function (labels) {
    for (var i in labels) this.labels.push(labels[i]);
}

storage.prototype.getLabels = function () {
    return this.labels;
}

storage.prototype.getLabel = function (id) {
    return this.labels[id];
}

storage.prototype.getLastDate = function () {
    return new Date(this.getThreadByIndex(0).date).add(-1).days();
}

storage.prototype.saveThreads = function () {
    var threads = {'list': this.threadList, 'ids': this.threadIds}
    var compressed = LZString.compress(angular.toJson(threads, false));
    localStorage.setItem(this.getEmail(), compressed);

    for (var i in this.threadList) this.threadList[i].date = new Date(this.threadList[i].date);

    return "Saving " + getSizeBytes(compressed.length * 16) + " of data...";
}

storage.prototype.getCategories = function () {
    var labels = [], categories = [], category = "CATEGORY_";
    for (var i in this.labels) if (this.labels[i].id.indexOf(category) == 0) labels.push(this.labels[i].id);

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

storage.prototype.retrieveThreads = function () {
    var item = localStorage.getItem(this.getEmail());
    if (!item) return false;

    item = JSON.parse(LZString.decompress(item));
    if (!item) return false;

    this.threadList = item.list;
    this.threadIds = item.ids;
    return true;
}

storage.prototype.classifyThreads = function () {
    /* First, we classify only default labels */
    var defaultLabels = this.getDefaultLabels(), thread, categories = this.getCategories();
    for (var i in defaultLabels) this.threadLabels[defaultLabels[i].id] = [];

    for (var i in this.threadList) {
        thread = this.threadList[i];

        if (thread.labels.indexOf('TRASH') > -1) { if (!isAttachment(thread)) this.threadLabels['TRASH'].push(i); else console.log(thread); }
        else if (thread.labels.indexOf('SPAM') > -1) this.threadLabels['SPAM'].push(i);
        else for (n in thread.labels) if (thread.labels[n] in this.threadLabels) this.threadLabels[thread.labels[n]].push(i);
    }

    /* Then, we classify categories from Inbox threads (so we don't see a deleted thread) */
    for (var i in categories) this.threadLabels[categories[i].id] = [];

    var inboxLabels = this.threadLabels['INBOX'], hasCategories;
    for (var i in inboxLabels) {
        hasCategories = false;
        thread = this.threadList[inboxLabels[i]];

        for (var n in thread.labels) if (thread.labels[n].indexOf('CATEGORY_') == 0) {
            hasCategories = true;
            this.threadLabels[thread.labels[n]].push(inboxLabels[i]);
        }

        /* If message don't have a category, it will be in personal category */
        if (!hasCategories) this.threadLabels['CATEGORY_PERSONAL'].push(inboxLabels[i]);

        /* Sort array of sent messages */
        this.threadLabels['SENT'] = this.threadLabels['SENT'].sort(function (a, b) {
            return (system.storage.threadList[a].dateSent > system.storage.threadList[b].dateSent);
            //return Date.compare(system.storage.threadList[a].dateSent, system.storage.threadList[b].dateSent);
        });

    }

    /* Count unread personal messages */
    this.countUnread();
}

storage.prototype.countUnread = function() {
    /* Count unread personal messages */
    var personal = this.threadLabels['CATEGORY_PERSONAL'], thread;
    this.defaultLabels[0].unread = 0;
    for (var i in personal) {
        thread = this.getThreadByIndex(personal[i]);
        if (thread.labels.indexOf('UNREAD') > -1) this.defaultLabels[0].unread += 1;
    }
}

storage.prototype.getDefaultLabels = function () {
    if (!this.defaultLabels) {
        this.defaultLabels = [
            {
                'id': 'INBOX', 'name': 'Inbox', 'unread': 0, 'class': 'fa-inbox',
                'category': {'id': "CATEGORY_PERSONAL", 'name': "Personal", 'class': 'fa-envelope-square'}
            },
            {'id': 'IMPORTANT', 'name': 'Important', 'class': 'fa-bookmark'},
            {'id': 'STARRED', 'name': 'Starred', 'class': 'fa-star'},
            {'id': 'SENT', 'name': 'Sent', 'class': 'fa-paper-plane'},
            {'id': 'DRAFT', 'name': 'Drafts', 'class': 'fa-file-text'},
            {'id': 'TRASH', 'name': 'Trash', 'class': 'fa-trash'},
            {'id': 'SPAM', 'name': 'Spam', 'class': 'fa-bolt '}
        ];
    }
    return this.defaultLabels;
}

storage.prototype.addNewThreadsToList = function (threads) {
    for (var i in threads) {
        this.threadList.push({id: threads[i].id});
        this.threadIds[threads[i].id] = this.threadList.length - 1;
    }
}

storage.prototype.addNewThreadToListSorted = function (thread) {
    var index = 0, actualThread;
    for (var i in this.threadList) {
        actualThread = this.threadList[i];
        if (Date.compare(thread.date, actualThread.date) == 1) { index = i; break; }
    }
    this.threadList.splice(index, 0, thread);
}

storage.prototype.sortThreadIds = function () {
    for (var i in this.threadList) this.threadIds[this.threadList[i].id] = i;
}

storage.prototype.mergeThreadList = function (messages) {
    this.threadList = messages.concat(this.threadList);
    this.threadIds = {};

    for (var i in this.threadList) this.threadIds[this.threadList[i].id] = i;

    if (messages.length > 0) system.notificationSystem.newNotification(messages.length + " new messages.");
}

storage.prototype.addMessagesToList = function (messages) {
    var threadsAux = [];
    for (var i in messages) {
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

storage.prototype.addOrUpdateThread = function (result) {
    var index = this.threadIds[result.id], thread = { id: result.id };
    if (index !== undefined) this.threadList.splice(index, 1);

    setThreadMetadata(thread, result);
    this.addNewThreadToListSorted(thread);
    this.sortThreadIds();
    this.saveThreads();
    this.classifyThreads();
}

storage.prototype.updateLabels = function (response) {
    var thread;
    for (var i in response) {
        thread = this.threadList[this.threadIds[response[i].result.id]];
        thread.labels = getThreadLabels(response[i].result);
    }
    this.saveThreads()
    this.classifyThreads();
}

storage.prototype.addMetadataToThreads = function (response) {
    for (var i in response) setThreadMetadata(this.getThread(i), response[i].result);
}

storage.prototype.addMessageToThread = function (message) {
    var thread = this.threadList[this.threadIds[message.threadId]];
    updateThreadMetadata(thread, message);
}

storage.prototype.getNumOfThreads = function (labelId) {
    if (!labelId) return this.threadList.length;
    else return this.threadLabels[labelId].length;
}

storage.prototype.getThread = function (id) {
    return this.threadList[this.threadIds[id]];
}

storage.prototype.getThreadByIndex = function (index, labelId) {
    if (!labelId) return this.threadList[index];
    else return this.threadList[this.threadLabels[labelId][index]];
}

storage.prototype.getThreads = function (page, num, labelId) {
    var startingThread = page * num;
    if (!labelId) return this.threadList.slice(startingThread, startingThread + num);
    else {
        var threads = [], threadLabels = this.threadLabels[labelId].slice(startingThread, startingThread + num);
        for (var i in threadLabels) threads.push(this.threadList[threadLabels[i]]);
        return threads;
    }
}

storage.prototype.addAttachments = function (messageId, attachments) {
    var attachment, header;
    for (var i in attachments) {
        attachment = {
            id: attachments[i].body.attachmentId,
            msgId: messageId,
            name: attachments[i].filename,
            mime: attachments[i].mimeType
        };
        for (var n in attachments[i].headers) {
            header = attachments[i].headers[n];
            if (header.name == 'Content-Transfer-Encoding') attachment.encoding = header.value;
        }

        this.attachmentList.push(attachment);
        this.attachmentIds[attachment.id] = this.attachmentList.length - 1;
    }
}

storage.prototype.getAttachment = function (attachId) {
    return this.attachmentList[this.attachmentIds[attachId]];
}