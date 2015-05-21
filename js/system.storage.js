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
        realName: result.displayName,
        name: result.displayName || result.emails[0].value.substring(0, result.emails[0].value.indexOf('@')),
        photo: result.image.url.slice(0, result.image.url.indexOf('?sz')) + '?sz=' + imageSize
    }
}

storage.prototype.getPersonalData = function () {
    return this.personal;
}

storage.prototype.getEmail = function () {
    return (this.personal) ? this.personal.email : undefined;
}

storage.prototype.setHistoryId = function (historyId) {
    this.historyId = historyId;
}

storage.prototype.getHistoryId = function () {
    return this.historyId;
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
    var threadList = [], actualThread;
    for (var i in this.threadList) {
        actualThread = this.threadList[i];
        threadList.push({
            id: actualThread.id,
            subject: actualThread.subject,
            snippet: actualThread.snippet,
            sender: actualThread.sender,
            labels: actualThread.labels,
            date: actualThread.date,
            dateSent: actualThread.dateSent,
            numOfMsgs: actualThread.numOfMsgs
        });
    }

    var compressed = LZString.compress(JSON.stringify({ list: threadList, history: this.historyId }));
    localStorage.setItem(this.getEmail(), compressed);

    for (var i in this.threadList) {
        if (this.threadList[i].date) this.threadList[i].date = new Date(this.threadList[i].date);
        if (this.threadList[i].dateSent) this.threadList[i].dateSent = new Date(this.threadList[i].dateSent);
    }

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
    this.setHistoryId(item.history);
    for (var i in this.threadList) this.threadList[i].messages = [];
    this.sortThreadIds();
    return true;
}

storage.prototype.classifyAllThreads = function () {
    /* First, we classify only default labels */
    var defaultLabels = this.getDefaultLabels(), thread, categories = this.getCategories();
    for (var i in defaultLabels) this.threadLabels[defaultLabels[i].id] = [];

    for (var i in this.threadList) {
        thread = this.threadList[i];

        if (thread.labels.indexOf('TRASH') > -1) { if (!isAttachment(thread)) this.threadLabels['TRASH'].push(thread.id); else console.log(thread); }
        else if (thread.labels.indexOf('SPAM') > -1) this.threadLabels['SPAM'].push(thread.id);
        else for (n in thread.labels) if (thread.labels[n] in this.threadLabels) this.threadLabels[thread.labels[n]].push(thread.id);
    }

    /* Then, we classify categories from Inbox threads (so we don't see a deleted thread) */
    for (var i in categories) this.threadLabels[categories[i].id] = [];

    var inboxLabels = this.threadLabels['INBOX'], hasCategories;
    for (var i in inboxLabels) {
        hasCategories = false; thread = this.getThread(inboxLabels[i]);

        for (var n in thread.labels) if (thread.labels[n].indexOf('CATEGORY_') == 0) {
            hasCategories = true;
            this.threadLabels[thread.labels[n]].push(inboxLabels[i]);
        }

        /* If message don't have a category, it will be in personal category */
        if (!hasCategories) this.threadLabels['CATEGORY_PERSONAL'].push(inboxLabels[i]);
    }

    /* Sort array of sent messages */
    this.sortMessages('SENT');

    /* Count unread personal messages */
    this.countUnread();
}

storage.prototype.sortMessages = function(label) {
    this.threadLabels[label] = this.threadLabels[label].sort(function (a, b) {
        return (system.storage.threadList[system.storage.threadIds[a]].dateSent < system.storage.threadList[system.storage.threadIds[b]].dateSent);
    });
}

storage.prototype.countUnread = function() {
    /* Count unread personal messages */
    var personal = this.threadLabels['CATEGORY_PERSONAL'], thread;
    this.defaultLabels[0].unread = 0;
    for (var i in personal) {
        thread = this.getThread(personal[i]);
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
    var index = 0, date;
    for (var i in this.threadList) {
        date = this.threadList[i].date || this.threadList[i].dateSent;
        if (Date.compare(thread.date, date) == 1) { index = i; break; }
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

    /* Set metadata */
    setThreadMetadata(thread, result);

    /* Add new thread to list and sort id list*/
    this.addNewThreadToListSorted(thread);
    this.sortThreadIds();

    /* Add thread to labels */
    var isInbox = false, hasCategories = false;
    for (var i in thread.labels) {
        if (!thread.labels[i].indexOf('INBOX')) isInbox = true;
        if (!thread.labels[i].indexOf('CATEGORY_')) hasCategories = true;

        this.addToLabel(thread.labels[i], thread.id);
    }
    if (isInbox && !hasCategories) this.addToLabel('CATEGORY_PERSONAL', thread.id);

    /* Save changes */
    this.saveThreads();
}

storage.prototype.updateLabels = function (response) {
    var thread, label, labels = [];
    for (var i in response) {
        /* Get old labels */
        thread = this.threadList[this.threadIds[response[i].result.id]];
        label = { old: thread.labels };

        /* Get new labels */
        thread.labels = getThreadLabels(response[i].result);
        label.new = thread.labels;

        /* Get the difference between old and new labels */
        labels.push({
            id: thread.id,
            toAdd: label.new.filter( function (el) { return label.old.indexOf( el ) < 0; }),
            toDelete: label.old.filter( function (el) { return label.new.indexOf( el ) < 0; })
        });
        var lastDifference = labels[labels.length - 1], hasCategories;

        /* If we are going to remove Inbox label, remove Categories too */
        if (lastDifference.toDelete.indexOf('INBOX') > -1) {
            hasCategories = false;
            for (var n in thread.labels) {
                if (!thread.labels[n].indexOf('CATEGORY_')) { lastDifference.toDelete.push(thread.labels[n]); hasCategories = true; }
            }
            if (!hasCategories) lastDifference.toDelete.push('CATEGORY_PERSONAL');
        }

        /* If we are going to add Inbox label, add Categories too */
        if (lastDifference.toAdd.indexOf('INBOX') > -1) {
            hasCategories = false;
            for (var i in thread.labels) {
                if (!thread.labels[i].indexOf('CATEGORY_')) { lastDifference.toAdd.push(thread.labels[i]); hasCategories = true; }
            }
            if (!hasCategories) lastDifference.toAdd.push('CATEGORY_PERSONAL');
        }
    }

    /* Update labels */
    for (var i in labels) {
        for (var n in labels[i].toDelete) this.removeFromLabel(labels[i].toDelete[n], labels[i].id);
        for (var n in labels[i].toAdd) this.addToLabel(labels[i].toAdd[n], labels[i].id);
    }

    /* Save changes */
    this.saveThreads();
}

storage.prototype.removeFromLabel = function (label, threadId) {
    var that = system.storage;
    var threads = that.threadLabels[label];

    /* Check if we need to update unread */
    if (label == 'UNREAD') that.addOrRemoveUnread(that.getThread(threadId), true);
    else {
        /* Check if we need to update unread */
        if (label == 'CATEGORY_PERSONAL' && isUnread(that.getThread(threadId))) that.defaultLabels[0].unread -= 1;

        /* Remove labels */
        for (var i in threads) if (threads[i] == threadId) { threads.splice(i, 1); break; }
    }
}

storage.prototype.addToLabel = function (label, threadId) {
    var that = system.storage;
    var threads = that.threadLabels[label], thread = that.getThread(threadId), threadAux;

    /* Check if we need to update unread */
    if (label == 'UNREAD') that.addOrRemoveUnread(thread, false);
    else {
        /* Check if we need to update unread */
        if (label == 'CATEGORY_PERSONAL' && isUnread(thread)) that.defaultLabels[0].unread += 1;

        /* Add labels */
        for (var i in threads) {
            threadAux = that.getThread(threads[i]);
            if (threadAux.date < thread.date) { threads.splice(i, 0, threadId); break; }
        }
    }
}

storage.prototype.addOrRemoveUnread = function (thread, removing) {
    var isInbox = (thread.labels.indexOf('INBOX') > -1), isPersonal = (thread.labels.indexOf('CATEGORY_PERSONAL') > -1);
    if (isPersonal) this.defaultLabels[0].unread += (removing) ? -1 : 1;
    else if (isInbox) {
        var hasCategories = false;
        for (var i in thread.labels) if (!thread.labels[i].indexOf('CATEGORY_')) { hasCategories = true; break; }
        if (!hasCategories) this.defaultLabels[0].unread += (removing) ? -1 : 1;
    }
}

storage.prototype.addHistoryLabels = function (labelsAdded, callback) {
    var thread, label;
    for (var i in labelsAdded) {
        /* Get thread */
        thread = this.getThread(labelsAdded[i].message.threadId);

        for (var n in labelsAdded[i].labelIds) {
            /* Get each label to add*/
            label = labelsAdded[i].labelIds[n];

            /* If it does not exist, add it */
            if (thread.labels.indexOf(label) == -1) {
                thread.labels.push(label);
                this.addToLabel(label, thread.id);

                /* If we are adding Inbox... */
                if (label == 'INBOX') {
                    var categories = getCategories(thread);

                    /* ...and thread has no categories, add to Personal; else to Categories */
                    if (categories.length == 0) this.addToLabel('CATEGORY_PERSONAL', thread.id)
                    else for (var x in categories) this.addToLabel(categories[x], thread.id);
                }
            }

            if (typeof callback == "function") callback();
        }
    }
}

storage.prototype.removeHistoryLabels = function (labelsRemoved, callback) {
    var thread, label, index;
    for (var i in labelsRemoved) {
        /* Get thread */
        thread = this.getThread(labelsRemoved[i].message.threadId);

        for (var n in labelsRemoved[i].labelIds) {
            /* Get each label to remove*/
            label = labelsRemoved[i].labelIds[n];

            /* If it does not exist, remove it */
            index = thread.labels.indexOf(label);
            if (index > -1) {
                thread.labels.splice(index, 1);
                this.removeFromLabel(label, thread.id);

                /* If we are removing Inbox */
                if (label == 'INBOX') {
                    var categories = getCategories(thread);

                    /* ...and thread has no categories, remove also Personal; else to Categories */
                    if (categories.length == 0) this.removeFromLabel('CATEGORY_PERSONAL', thread.id);
                    else for (var x in categories) this.removeFromLabel(categories[x], thread.id);
                }
            }

            if (typeof callback == "function") callback();
        }
    }
}

//TODO
storage.prototype.addHistoryMessage = function (messagesAdded, callback) {
    var that = system.storage;

    console.log("Messages added")
    var thread, threadId, messageId, label;
    for (var i in messagesAdded) {
        console.log(messagesAdded[i].message.threadId);
        threadId = messagesAdded[i].message.threadId, thread = that.getThread(threadId);

        if (thread) that.removeThread(thread.id);

        system.network.getSingleThread(threadId, function (response) {
            thread = { id: threadId }; that.threadList.push(thread);
            that.threadIds[thread.id] = that.threadList.length - 1;

            setThreadMetadata(thread, response.result);
            that.addToAllLabels(thread);
            
            if (typeof callback == "function") callback();
        });
    }
}

//TODO
storage.prototype.removeHistoryMessage = function (messagesDeleted, callback) {
    console.log("Messages deleted")
    for (var i in messagesDeleted) {
        console.log(messagesDeleted[i])
    }

    if (typeof callback == "function") callback();
}

//FIXME AUX
storage.prototype.addToAllLabels = function (thread) {
    this.addOrRemoveAllLabels(thread, true);
}

//FIXME AUX
storage.prototype.removeFromAllLabels = function (thread) {
    this.addOrRemoveAllLabels(thread, false);
}

//FIXME AUX
storage.prototype.addOrRemoveAllLabels = function (thread, add) {
    var hasInbox, hasCategories, label, func = (add) ? system.storage.addToLabel : system.storage.removeFromLabel;
    for (var i in thread.labels) {
        label = thread.labels[i];
        if (label == 'INBOX') hasInbox = true;
        else if (!label.indexOf('CATEGORY_')) hasCategories = true;
        func(label, thread.id);
    }
    if (hasInbox && !hasCategories) func('CATEGORY_PERSONAL', thread.id);
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

storage.prototype.removeThread = function (id) {
    var index = this.threadIds[id], thread = this.threadList[index];

    this.removeFromAllLabels(thread);
    this.threadIds[id] = undefined;
    this.threadList.splice(index, 1);
}

storage.prototype.getThreadByIndex = function (index, labelId) {
    if (!labelId) return this.threadList[index];
    else return this.getThread(this.threadLabels[labelId][index]);
}

storage.prototype.getThreads = function (page, num, labelId) {
    var startingThread = page * num;
    if (!labelId) return this.threadList.slice(startingThread, startingThread + num);
    else {
        var threads = [], threadLabels = this.threadLabels[labelId].slice(startingThread, startingThread + num);
        for (var i in threadLabels) threads.push(this.getThread(threadLabels[i]));
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