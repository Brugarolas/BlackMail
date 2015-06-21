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
    console.log(result);
    this.personal = {
        email: (result.emails) ? result.emails[0].value : 'me',
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

storage.prototype.saveThreads = function () {
    var threadList = [];
    _.forEach(this.threadList, function (actualThread) {
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
    });

    var compressed = LZString.compress(JSON.stringify({ list: threadList, history: this.historyId }));
    localStorage.setItem(this.getEmail(), compressed);

    _.forEach(this.threadList, function (actualThread) {
        if (actualThread.date) actualThread.date = new Date(actualThread.date);
        if (actualThread.dateSent) actualThread.dateSent = new Date(actualThread.dateSent);
    })

    return "Saving " + getSizeBytes(compressed.length * 16) + " of data...";
}

storage.prototype.getCategories = function () {
    var labels = _.pluck(this.labels, 'id'), categories = [], category = "CATEGORY_";

    var sortedLabels = [
        {'id': "CATEGORY_PERSONAL", 'name': "Personal", 'class': 'fa-envelope-square'},
        {'id': "CATEGORY_SOCIAL", 'name': "Social", 'class': 'fa-users'},
        {'id': "CATEGORY_PROMOTIONS", 'name': "Promotions", 'class': 'fa-tags'},
        {'id': "CATEGORY_UPDATES", 'name': "Updates", 'class': 'fa-info-circle'},
        {'id': "CATEGORY_FORUMS", 'name': "Forums", 'class': 'fa-comments'}
    ];

    _.forEach(sortedLabels, function (actualLabel) {
        if (labels.indexOf(actualLabel.id) > -1) categories.push(actualLabel);
    });
    return categories;
}

storage.prototype.retrieveThreads = function () {
    var item = localStorage.getItem(this.getEmail());
    if (!item) return false;

    item = JSON.parse(LZString.decompress(item));
    if (!item) return false;

    this.threadList = item.list;
    this.setHistoryId(item.history);
    _.forEach(this.threadList, function (thread) {
        thread.messages = [];
    })
    this.sortThreadIds();
    return true;
}

storage.prototype.classifyAllThreads = function () {
    /* First, we classify only default labels */
    var defaultLabels = this.getDefaultLabels(), categories = this.getCategories();
    _.forEach(defaultLabels, function (actualLabel) {
        this.threadLabels[actualLabel.id] = [];
    }, this);

    _.forEach(this.threadList, function (actualThread) {
        if (actualThread.labels == 'TRASH') {
            if (!isAttachment(actualThread)) this.threadLabels['TRASH'].push(actualThread.id);
            else console.log(actualThread);
        }
        else if (actualThread.labels == 'SPAM') this.threadLabels['SPAM'].push(actualThread.id);
        else _.forEach(actualThread.labels, function (actualLabel) {
            if (this.threadLabels[actualLabel]) this.threadLabels[actualLabel].push(actualThread.id);
        }, this);
    }, this);

    /* Then, we classify categories from Inbox threads (so we don't see a deleted thread) */
    _.forEach(categories, function (category) {
        this.threadLabels[category.id] = [];
    }, this);

    var inboxLabels = this.threadLabels['INBOX'], hasCategories, thread;
    _.forEach(inboxLabels, function (actualThreadId) {
        thread = this.threadList[this.threadIds[actualThreadId]];
        hasCategories = false;

        _.forEach(thread.labels, function (actualLabel) {
            if (_.includes(actualLabel, 'CATEGORY_')) {
                hasCategories = true;
                this.threadLabels[actualLabel].push(actualThreadId);
            }
        }, this);

        if (!hasCategories) this.threadLabels['CATEGORY_PERSONAL'].push(actualThreadId);
    }, this);

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

storage.prototype.countUnread = function () {
    var thread;
    this.defaultLabels[0].unread = 0;
    _.forEach(this.threadLabels['CATEGORY_PERSONAL'], function (threadId) {
        thread = this.getThread(threadId);
        if (thread.labels.indexOf('UNREAD') > -1) this.defaultLabels[0].unread += 1;
    }, system.storage);
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
    _.forEach(threads, function (newThread) {
        this.threadList.push({id: newThread.id});
        this.threadIds[newThread.id] = this.threadList.length - 1;
    }, this);
}

storage.prototype.addThread = function (thread) {
    this.threadList.push(thread);
    this.threadIds[thread.id] = this.threadList.length - 1;
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
    this.sortThreadIds();

    if (messages.length > 0) system.notificationSystem.newNotification(messages.length + " new messages.");
}

storage.prototype.addOrUpdateThread = function (result) {
    var index = this.threadIds[result.id], thread = { id: result.id };
    if (index !== undefined) _.pullAt(this.threadList, index);

    /* Set metadata */
    setThreadMetadata(thread, result);

    /* Add new thread to list and sort id list*/
    this.addNewThreadToListSorted(thread);
    this.sortThreadIds();

    /* Add thread to labels */
    var isInbox = false, hasCategories = false;
    _.forEach(thread.labels, function (actualLabel) {
        if (actualLabel == 'INBOX') isInbox = true;
        else if (!actualLabel.indexOf('CATEGORY_')) hasCategories = true;

        this.addToLabel(thread.labels[i], thread.id);
    }, this);

    if (isInbox && !hasCategories) this.addToLabel('CATEGORY_PERSONAL', thread.id);

    /* Save changes */
    this.saveThreads();
}

storage.prototype.updateLabels = function (response) {
    var thread, label, labels = [];
    console.log(response);

    _.forEach(response, function (part) {
        // Get old labels
        thread = this.getThread(part.result.id);
        label = { old: thread.labels };

        // Get new labels
        thread.labels = getThreadLabels(part.result);
        label.new = thread.labels;

        // Get the difference between old and new labels
        labels.push({
            thread: thread,
            toAdd: _.difference(label.new, label.old),
            toDelete: _.difference(label.old, label.new)
        });
        var lastDifference = labels[labels.length - 1], hasCategories;

        // If we are going to remove Inbox label, remove Categories too
        if (lastDifference.toDelete.indexOf('INBOX') > -1) {
            hasCategories = false;
            _.forEach(thread.labels, function (label) {
                if (!label.indexOf('CATEGORY_')) {
                    lastDifference.toDelete.push(label);
                    hasCategories = true;
                }
            });
            if (!hasCategories) lastDifference.toDelete.push('CATEGORY_PERSONAL');
        }

        // If we are going to add Inbox label, add Categories too
        if (lastDifference.toAdd.indexOf('INBOX') > -1) {
            hasCategories = false;
            _.forEach(thread.labels, function (label) {
                if (!label.indexOf('CATEGORY_')) {
                    lastDifference.toAdd.push(label);
                    hasCategories = true;
                }
            });
            if (!hasCategories) lastDifference.toAdd.push('CATEGORY_PERSONAL');
        }
    }, this);

    // Update labels
    _.forEach(labels, function (actualLabel) {
        _.forEach(actualLabel.toDelete, function (label) {
            this.addOrRemoveLabel(label, actualLabel.thread, false);
        }, this);

        _.forEach(actualLabel.toAdd, function (label) {
            this.addOrRemoveLabel(label, actualLabel.thread, true);
        }, this);
    }, this);

    /* Save changes */
    this.saveThreads();
}


storage.prototype.addOrRemoveLabel = function (label, thread, add) {
    var threads = this.threadLabels[label], threadAux;

    /* Check if we need to update unread */
    if (label == 'UNREAD') this.addOrRemoveUnread(thread, add);
    else {
        /* Check if we need to update unread */
        if (label == 'CATEGORY_PERSONAL' && isUnread(thread)) this.defaultLabels[0].unread += (add) ? 1 : -1;

        /* Check if we are adding or removing labels */
        if (!add) {
            /* Remove labels */
            for (var n in threads) {
                if (threads[n] == thread.id) {
                    _.pullAt(threads, parseInt(n));
                    break;
                }
            }
        } else {
            /* Add labels */
            for (var i in threads) {
                threadAux = this.getThread(threads[i]);
                if (threadAux.date < thread.date) {
                    threads.splice(parseInt(i), 0, thread.id);
                    break;
                }
            }
        }
    }
}

storage.prototype.addOrRemoveUnread = function (thread, removing) {
    var isInbox = (thread.labels == 'INBOX'), isPersonal = (thread.labels == 'CATEGORY_PERSONAL');
    if (isPersonal) this.defaultLabels[0].unread += (removing) ? -1 : 1;
    else if (isInbox) {
        var hasCategories = false;
        _.forEach(thread.labels, function (actualThread) {
            if (!actualThread.indexOf('CATEGORY_')) {
                hasCategories = true;
                return false;
            }
        });
        if (!hasCategories) this.defaultLabels[0].unread += (removing) ? -1 : 1;
    }
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
    var hasInbox, hasCategories, label;
    _.forEach(thread.labels, function (label) {
        if (label == 'INBOX') hasInbox = true;
        else if (!label.indexOf('CATEGORY_')) hasCategories = true;

        this.addOrRemoveLabel(label, thread, add);
    }, this);
    if (hasInbox && !hasCategories) this.addOrRemoveLabel('CATEGORY_PERSONAL', thread, add);
}

storage.prototype.addMetadataToThreads = function (response) {
    for (var i in response) setThreadMetadata(this.getThread(i), response[i].result);
}

storage.prototype.addMessageToThread = function (message) {
    updateThreadMetadata(this.getThread(message.threadId), message);
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
    _.pullAt(this.threadList, index);
    this.sortThreadIds();
}

storage.prototype.getThreadByIndex = function (index, labelId) {
    if (!labelId) return this.threadList[index];
    else return this.getThread(this.threadLabels[labelId][index]);
}

storage.prototype.getThreads = function (page, num, labelId) {
    var startingThread = page * num;
    if (!labelId) return _.slice(this.threadList, startingThread, startingThread + num);
    else {
        var threads = [], threadLabels = _.slice(this.threadLabels[labelId], startingThread, startingThread + num);
        for (var i in threadLabels) threads.push(this.getThread(threadLabels[i]));
        return threads;
    }
}

storage.prototype.addAttachments = function (messageId, attachments) {
    var attachment, header;
    _.forEach(attachments, function (actualAttach) {
        attachment = {
            id: actualAttach.body.attachmentId,
            msgId: messageId,
            name: actualAttach.filename,
            mime: actualAttach.mimeType
        };

        _.forEach(actualAttach.headers, function (header) {
            if (header.name == 'Content-Transfer-Encoding') attachment.encoding = header.value;
        })

        this.attachmentList.push(attachment);
        this.attachmentIds[attachment.id] = this.attachmentList.length - 1;
    }, this);
}

storage.prototype.getAttachment = function (attachId) {
    return this.attachmentList[this.attachmentIds[attachId]];
}