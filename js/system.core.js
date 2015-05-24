/**
 * Created by Usuario on 30/04/2015.
 */
"use strict";

/** Constructor **/
function System() {
    //Check operating system
    this.operatingSystem = getOS();

    //Detect platform
    this.platform = (typeof process !== "undefined" && typeof require !== "undefined") ? "Node" : "Anything";
    if (this.platform == "Node") {
        this.platform = (typeof require('nw.gui') !== "undefined") ? "Node Webkit" : "Node.js";
    }

    // Variables
    this.history = [];

    //Init sub-systems
    if (typeof notificationSystem == 'function') this.notificationSystem = new notificationSystem();
    if (typeof gmail == 'function') this.network = new gmail('me');
    if (typeof storage == 'function') this.storage = new storage();
}

/** Singleton **/
var system = new System();
System.prototype.this = system;

/** Prototype **/
System.prototype.isMobile = function () {
    var mobileOS = ["Android", "BlackBerry", "iOS", "Windows Phone"];
    for (var i in mobileOS) if (this.operatingSystem == mobileOS[i]) return true;
    return false;
}

function getOS() {
    var userAgent = navigator.userAgent, OS = [
        {'regex': /Android/i, 'name': "Android"},
        {'regex': /BlackBerry/i, 'name': "BlackBerry"},
        {'regex': /iPhone|iPad|iPod/i, 'name': "iOS"},
        {'regex': /IEMobile/i, 'name': "Windows Phone"},
        {'regex': /Windows/i, 'name': "Windows Desktop"}
    ];

    for (var i in OS) if (OS[i].regex.test(userAgent)) return OS[i].name;
    else return "Other";
}

/**
 * Load a Google API.
 * @param apiName Name of the API to load
 * @param version Version of the API to load
 * @param callback Method that will be executed when the API load
 * @param error Method that will be executed if the load fails
 */
System.prototype.loadGoogleAPI = function (apiName, version, callback, error) {
    system.network.loadAPI(apiName, version, callback, error);
}

/**
 * Get Google+ personal data
 * @param imageSize Size in pixels of your profile image
 * @param callback Method that will be executed when data is received
 * @param error
 */
System.prototype.getPersonalData = function (imageSize, callback, error) {
    //If we don't have data in storage, we will need to load from network
    if (!this.storage.getPersonalData())
        system.network.getPersonalData(function(response) {
            system.storage.savePersonalData(response.result, imageSize);
            system.network.setEmail(system.storage.getEmail());
            callback(system.storage.getPersonalData());
        }, error);
    else callback(system.storage.getPersonalData());
}

/**
 *
 * @param callback
 * @param error
 */
System.prototype.getLabelList = function (callback, error) {
    if (system.storage.labels.length == 0)
        system.network.getLabelList(function(response) {
            system.storage.saveLabels(response.result.labels);
            callback(system.storage.getLabels());
        }, error);
    else callback(system.storage.getLabels());
}

/**
 *
 * @param callbackRetrieve
 * @param callbackInexistant
 */
System.prototype.retrieveThreads = function (callbackRetrieve, callbackInexistant) {
    //TODO
    this.test();

    if (system.storage.retrieveThreads()) {
        system.network.getHistoryList(system.storage.getHistoryId(), function (response) {
            if (response.code == 404) callbackInexistant();
            else callbackRetrieve();
        });
    }
    else callbackInexistant();
}

/**
 *
 * @param between
 * @param end
 * @param error
 */
System.prototype.performFullSync = function (between, end, error) {
    var next = function (response) {
        system.storage.addNewThreadsToList(response.threads); between();
        if (response.nextPageToken) system.network.getAllThreadsIds(next, error, response.nextPageToken); else end();
    }
    system.network.getAllThreadsIds(next, error);
}

/**
 *
 * @param threadsPerPage
 * @param between
 * @param end
 * @param error
 */
System.prototype.getPageThreads = function (threadsPerPage, between, end, error) {
    var numOfPages = Math.ceil(system.storage.getNumOfThreads() / threadsPerPage), steps = [], actualPage = 0;
    for (var page = 0; page < numOfPages; page++) steps.push(system.storage.getThreads(page, threadsPerPage));
    var next = function (response) {
        if (actualPage == 0) system.storage.setHistoryId(response[system.storage.getThreadByIndex(0).id].result.historyId);

        system.storage.addMetadataToThreads(response); actualPage += 1; between(actualPage);
        if (actualPage < numOfPages) system.network.getPageThreads(steps[actualPage], next, error); else end();
    }
    system.network.getPageThreads(steps[0], next, error);
}

/**
 *
 * @param newMessages
 * @param threadsPerPage
 * @param end
 * @param error
 */
System.prototype.getNewMessagesData = function (newMessages, threadsPerPage, end, error) {
    var numOfPages = Math.ceil(newMessages.length / threadsPerPage), steps = [], actualPage = 0, starting = 0;
    for (var page = 0; page < numOfPages; page++) {
        steps.push(newMessages.slice(starting, starting + threadsPerPage));
        starting += threadsPerPage;
    }

    var next = function (response) {
        for (var i in response) system.storage.addMessageToThread(response[i].result); actualPage += 1;
        if (actualPage < numOfPages) system.network.getNewMessagesData(steps[actualPage], next, error); else end();
    }

    system.network.getNewMessagesData(steps[0], next, error);
}

/**
 *
 * @param index
 * @param label
 * @param callback
 * @param unread
 * @param error
 */
System.prototype.getThread = function (index, label, unreadMth, callback, error) {
    var thread = system.storage.getThreadByIndex(index, label);
    if (thread.messages.length > 0) callback(thread);
    else system.network.getThread(thread.id, function (response) {
        //Mark message as read if needed
        if (thread.labels.indexOf('UNREAD') > -1) system.modifyThreads([thread.id], [], ['UNREAD'], unreadMth, error);

        console.log(response);

        //Do the rest
        var email, msg, resources = [];
        for (var i in response.messages) {
            msg = response.messages[i]; email = { id: msg.id, images: [], attachments: [] };

            // If it is not multipart...
            if (!msg.payload.parts) email.html = ((msg.payload.mimeType == "text/html") ? obtainMainHTML : createMainHTML)(msg.payload.body.data);
            else parsePayload(email, msg.payload);

            if (email.attachments.length > 0) system.storage.addAttachments(email.id, email.attachments);
            if (email.images.length > 0) resources.push({ isImage: true, mail: email });
            thread.messages.push(email);
        }

        async.forEach(resources, function (item, done) {
            system.network.getAttachments(item.mail, item.isImage, function (response) {
                var data, email = item.mail, isImg = item.isImage;
                for (var i in response) {
                    data = response[i].result.data.replace(/-/g, '+').replace(/_/g, '/');

                    if (isImg) email.html = email.html.replace(getImageSrcToReplace(email.images[i]), 'data:' + email.images[i].mimeType + ';charset=utf-8;base64,' + data);
                    else email.attachments[i].body.data = encodeURIComponent(data);
                }
                done();
            }, error);
        }, function(err) {
            callback(thread);
        });

    }, error);
}

/**
 *
 * @param threads
 * @param addLabels
 * @param removeLabels
 * @param callback
 * @param error
 */
System.prototype.modifyThreads = function (threads, addLabels, removeLabels, callback, error) {
    system.network.modifyThreads(threads, addLabels, removeLabels, function (response) {
        /* Get and update last history Id */
        system.updateHistoryId(response[Object.keys(response).length - 1].result.id, error);

        /* Update labels and execute callback */
        system.storage.updateLabels(response);
        callback();
    }, error);
}

System.prototype.deleteThreads = function (threads, callback, error) {
    system.network.deleteThreads(threads, function (response) {
        system.updateRefresh(callback, error);
    }, error);
}

System.prototype.updateHistoryId = function (threadId, error) {
    system.network.getSingleThread(threadId, function (response) {
        system.storage.setHistoryId(response.result.historyId);
    }, error);
}

/**
 *
 * @param to
 * @param subject
 * @param message
 * @param callback
 * @param error
 */
System.prototype.sendMessage = function (name, to, subject, message, callback, error) {
    var email = (name) ? name+" <"+system.storage.getEmail()+">" : system.storage.getEmail();
    var raw = "From: " + email + "\r\n" +
        "To:  " + to + "\r\n" +
        "Subject: " + subject + "\r\n" +
        "\r\n" + utf8_encode(message);

    system.network.sendMessage(btoa(raw).replace(/\//g, '_').replace(/\+/g, '-'), function (response) {
        system.network.getThread(response.threadId, function (response) {
            /* Save history Id */
            system.storage.setHistoryId(response.result.historyId);

            /* Save thread */
            system.storage.addOrUpdateThread(response.result);
            callback();
        }, error);
    }, error);
}

System.prototype.getFileAttachment = function (attachId, callback, error) {
    var attachment = system.storage.getAttachment(attachId);
    if (attachment.data) callback(attachment);
    else {
        system.network.getSingleAttachment(attachment.msgId, attachment.id, function (response) {
            attachment.data = (attachment.encoding.toLocaleLowerCase() == "base64") ? response.data.replace(/-/g, '+').replace(/_/g, '/') : encodeURIComponent(atob(response.data));
            callback(attachment);
        }, error);
    }
}


System.prototype.test = function () {
    system.network.getHistoryList(166965, function (response) {
        console.log(response);
    });
}

System.prototype.updateRefresh = function (callback, error) {
    this.historyCallback = callback;

    system.network.getHistoryList(system.storage.getHistoryId(), function (response) {
        if (!response.result.history) callback();
        else {
            // Save history
            for (var i in response.result.history) system.history.push(response.result.history[i]);

            // Start sync history
            system.syncHistory();

            /* Save history Id */
            system.storage.setHistoryId(response.result.historyId);
        }
    }, error);
}

System.prototype.syncHistory = function () {
    if (this.history.length == 0) {
        this.historyCallback();

        // Save changes
        system.storage.saveThreads();
    }
    else {
        var history = this.history.shift();
        console.log(history);

        if (history.labelsAdded) system.addOrRemoveHistoryLabels(history.labelsAdded, true);
        else if (history.labelsRemoved) system.addOrRemoveHistoryLabels(history.labelsRemoved, false);
        else if (history.messagesAdded) system.updateHistoryMessages(history.messagesAdded);
        else if (history.messagesDeleted) system.updateHistoryMessages(history.messagesDeleted);
        else system.syncHistory();
    }
}

//FIXME Aux
System.prototype.addOrRemoveHistoryLabels = function (labelsModified, add) {
    var thread, label, index;
    for (var i in labelsModified) {
        /* Get thread */
        thread = system.storage.getThread(labelsModified[i].message.threadId);

        for (var n in labelsModified[i].labelIds) {
            /* Get each label */
            label = labelsModified[i].labelIds[n];

            /* Get index */
            index = thread.labels.indexOf(label);

            if (add && index == -1) {
                /* If we are adding and it does not exist, add it */
                thread.labels.push(label);
                system.addOrRemoveLabel(label, thread, add);
            } else if (!add && index > -1) {
                /* If we are removing and it does exist, remove it*/
                thread.labels.splice(index, 1);
                system.addOrRemoveLabel(label, thread, add);
            }
        }
    }

    system.syncHistory();
}

System.prototype.updateHistoryMessages = function (messagesAdded) {
    var thread, threadId, lastId = messagesAdded[messagesAdded.length - 1].message.threadId, isLast;
    for (var i in messagesAdded) {
        threadId = messagesAdded[i].message.threadId, thread = system.storage.getThread(threadId), isLast = (threadId == lastId);

        /* If thread exist, its easier to remove it and add it updated */
        if (thread) system.storage.removeThread(thread.id);

        /* We get updated thread */
        system.network.getSingleThread(threadId, function (response) {
            if (response.code != 404) {
                thread = { id: threadId };
                system.storage.addThread(thread);

                console.log(response);
                setThreadMetadata(thread, response.result);
                system.storage.addToAllLabels(thread);
            }

            if (isLast) system.syncHistory();
        });
    }
}

System.prototype.removeHistoryMessages = function (messagesRemoved) {
    var thread, threadId, messageId, label;
    for (var i in messagesRemoved) {
        threadId = messagesRemoved[i].message.threadId, thread = system.storage.getThread(threadId);

        /* If thread exist, remove it */
        if (thread) system.storage.removeThread(thread.id);
    }

    system.syncHistory();
}

//FIXME Aux
System.prototype.addOrRemoveLabel = function (label, thread, add) {
    /* Add or remove */
    system.storage.addOrRemoveLabel(label, thread, add);

    /* If we are adding Inbox... */
    if (label == 'INBOX') {
        var categories = getCategories(thread);

        /* ...and thread has no categories, add to Personal; else to Categories */
        if (categories.length == 0) system.storage.addOrRemoveLabel('CATEGORY_PERSONAL', thread, add)
        else for (var i in categories) system.storage.addOrRemoveLabel(categories[i], thread, add);
    }
}

System.prototype.endLoading = function () {
    system.storage.classifyAllThreads();
}