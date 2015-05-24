/**
 * Created by Andrés on 22/04/2015.
 */
"use strict";

function gmail(email) {
    this.email = email;
}

gmail.prototype.setEmail = function (email) {
    this.email = email;
}

gmail.prototype.getEmail = function () {
    return this.email;
}

gmail.prototype.loadAPI = function (name, version, callback, error) {
    gapi.client.load(name, version).then(callback, error);
}

gmail.prototype.getPersonalData = function (callback, error) {
    gapi.client.plus.people.get({
        'userId': this.email
    }).execute(callback, error);
}

gmail.prototype.getLabelList = function (callback, error) {
    gapi.client.gmail.users.labels.list({
        'userId': this.email
    }).execute(callback, error);
}

gmail.prototype.getAllThreadsIds = function (next, error, nextPageToken) {
    gapi.client.gmail.users.threads.list({
        'userId': this.email,
        'pageToken': nextPageToken,
        'includeSpamTrash': true,
        'q': '!in:chats'
    }).execute(next, error);
}

gmail.prototype.getSingleThread = function (threadId, callback, error) {
    gapi.client.gmail.users.threads.get({
        'userId': this.email,
        'id': threadId,
        'format': 'metadata'
    }).execute(callback, error);
}

gmail.prototype.getPageThreads = function (threads, callback, error) {
    var batchRequest = gapi.client.newBatch();
    for (var i in threads) {
        batchRequest.add(
            gapi.client.gmail.users.threads.get({
                'userId': this.email,
                'id': threads[i].id,
                'format': 'metadata'
            }), {'id': threads[i].id}
        );
    }
    batchRequest.execute(callback, error);
}

gmail.prototype.getThread = function (id, callback, error) {
    gapi.client.gmail.users.threads.get({
        'userId': this.email,
        'id': id,
        'format': 'full'
    }).execute(callback, error);
}

gmail.prototype.getAttachments = function (email, isImage, callback, error) {
    var batchRequest = gapi.client.newBatch(), iterable = (isImage) ? email.images : email.attachments;
    for (var i in iterable) {
        batchRequest.add(
            gapi.client.gmail.users.messages.attachments.get({
                'id': iterable[i].body.attachmentId,
                'messageId': email.id,
                'userId': this.email
            }), {'id': i}
        );
    }
    batchRequest.execute(callback, error);
}

gmail.prototype.getSingleAttachment = function(messageId, id, callback, error) {
    gapi.client.gmail.users.messages.attachments.get({
        'id': id,
        'messageId': messageId,
        'userId': this.email
    }).execute(callback, error);
}

gmail.prototype.sendMessage = function(content, callback, error) {
    gapi.client.gmail.users.messages.send({
        'userId': this.email,
        'resource': {
            'raw': content
        }
    }).execute(callback, error);
}

gmail.prototype.modifyThreads = function (threads, addLabels, removeLabels, callback, error) {
    var batchRequest = gapi.client.newBatch();
    for (var i in threads) {
        batchRequest.add(
            gapi.client.gmail.users.threads.modify({
                'id': threads[i],
                'userId': this.email,
                'addLabelIds': addLabels,
                'removeLabelIds': removeLabels
            }), {'id': i}
        );
    }
    batchRequest.execute(callback, error);
}

gmail.prototype.deleteThreads = function (threads, callback, error) {
    var batchRequest = gapi.client.newBatch();
    for (var i in threads) {
        batchRequest.add(
            gapi.client.gmail.users.threads.delete({
                'id': threads[i],
                'userId': this.email
            }), {'id': i}
        );
    }
    batchRequest.execute(callback, error);
}

gmail.prototype.getHistoryList = function (historyId, callback, error) {
    console.log("Loading with : " + historyId);
    gapi.client.gmail.users.history.list({
        'userId': this.email,
        'startHistoryId': historyId
    }).execute(callback, error);
}