/**
 * Created by Andr�s on 22/04/2015.
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
        'userId': 'me'
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

gmail.prototype.getNewMessages = function (next, error, lastDate, nextPageToken) {
    gapi.client.gmail.users.messages.list({
        'userId': this.email,
        'pageToken': nextPageToken,
        'includeSpamTrash': true,
        'q': '!in:chats after:' + lastDate.toString('yyyy/MM/dd')
    }).execute(next, error);
}

gmail.prototype.getNewMessagesData = function (messages, callback, error) {
    var batchRequest = gapi.client.newBatch();
    for (var i in messages) {
        batchRequest.add(
            gapi.client.gmail.users.messages.get({
                'userId': this.email,
                'id': messages[i].id,
                'format': 'metadata'
            }), {'id': messages[i].id}
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
    for (i in iterable) {
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

gmail.prototype.getSingleAttachment = function(messageId, id, callback) {
    gapi.client.gmail.users.messages.attachments.get({
        'id': id,
        'messageId': messageId,
        'userId': this.email
    }).execute(callback);
}

gmail.prototype.sendMessage = function(content, callback, error) {
    gapi.client.gmail.users.messages.send({
        'userId': 'me',
        'resource': {
            'raw': content
        }
    }).execute(callback, error);
}

gmail.prototype.modifyThreads = function (threads, addLabels, removeLabels, callback, error) {
    var batchRequest = gapi.client.newBatch();
    for (i in threads) {
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