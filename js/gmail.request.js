/**
 * Created by Andr�s on 22/04/2015.
 */

function gmail(email) {
    this.email = email;
}

gmail.prototype.setEmail = function (email) {
    this.email = email;
}

gmail.prototype.getEmail = function () {
    return this.email;
}

gmail.prototype.getNewMessagesRequest = function (lastDate, nextPageToken) {
    if (nextPageToken && nextPageToken !== undefined) {
        return gapi.client.gmail.users.messages.list({
            'userId': this.email,
            'pageToken': nextPageToken,
            'includeSpamTrash': true,
            'q': '!in:chats after:' + lastDate.toString('yyyy/MM/dd')
        });
    } else {
        return gapi.client.gmail.users.messages.list({
            'userId': this.email,
            'includeSpamTrash': true,
            'q': '!in:chats after:' + lastDate.toString('yyyy/MM/dd')
        });
    }
}

gmail.prototype.getAllThreadsRequest = function (nextPageToken) {
    if (nextPageToken === undefined) {
        return gapi.client.gmail.users.threads.list({
            'userId': this.email,
            'includeSpamTrash': true,
            'q': '!in:chats'
        });
    } else {
        return gapi.client.gmail.users.threads.list({
            'userId': this.email,
            'pageToken': nextPageToken,
            'includeSpamTrash': true,
            'q': '!in:chats'
        });
    }
}

gmail.prototype.getPageThreadsBatchRequest = function (currentPage, threadsPerPage) {
    var startingThread = currentPage * threadsPerPage;
    var lastPage = Math.min(startingThread + threadsPerPage, system.getNumOfThreads());
    var batchRequest = gapi.client.newBatch();

    for (i = startingThread; i < lastPage; i++) {
        batchRequest.add(
            gapi.client.gmail.users.threads.get({
                'userId': this.email,
                'id': system.getThreadByIndex(i).id,
                'format': 'metadata'
            }), {'id': i}
        );
    }

    return batchRequest;
}

gmail.prototype.getNewMessagesBatchRequest = function (newMessages) {
    var batchRequest = gapi.client.newBatch();

    for (i in newMessages) {
        batchRequest.add(
            gapi.client.gmail.users.messages.get({
                'userId': this.email,
                'id': newMessages[i].id,
                'format': 'metadata'
            }), {'id': newMessages[i].id}
        );
    }

    return batchRequest;
}

gmail.prototype.getEmailImagesBatchRequest = function (email) {
    var batchRequest = gapi.client.newBatch();

    for (i in email.images) {
        batchRequest.add(
            gapi.client.gmail.users.messages.attachments.get({
                'id': email.images[i].body.attachmentId,
                'messageId': email.id,
                'userId': this.email
            }), {'id': i}
        );
    }

    return batchRequest;
}

gmail.prototype.getThreadRequest = function (id) {
    return gapi.client.gmail.users.threads.get({
        'userId': this.email,
        'id': id,
        'format': 'full'
    });
}

gmail.prototype.getLabelListRequest = function () {
    return gapi.client.gmail.users.labels.list({
        'userId': this.email
    });
}

gmail.prototype.sendMessage = function(to, subject, content, callback) {
    var email = "From: " + this.email + "\r\n" +
        "To:  " + to + "\r\n" +
        "Subject: " + subject + "\r\n" +
        "\r\n" + utf8_encode(content);

    gapi.client.gmail.users.messages.send({
        'userId': 'me',
        'resource': {
            'raw': btoa(email).replace(/\//g, '_').replace(/\+/g, '-')
        }
    }).execute(callback);
}

gmail.prototype.getSendThreadToTrashBatch = function (threads, callback) {
    var batchRequest = gapi.client.newBatch();
    for (i in threads) {
        batchRequest.add(
            gapi.client.gmail.users.threads.modify({
                'id': threads[i],
                'userId': this.email,
                'addLabelIds': ['TRASH']
            }), {'id': i}
        );
    }
    batchRequest.execute(callback);
}

gmail.prototype.getRetrieveFromTrashBatch = function (threads, callback) {
    var batchRequest = gapi.client.newBatch();
    for (i in threads) {
        batchRequest.add(
            gapi.client.gmail.users.threads.modify({
                'id': threads[i],
                'userId': this.email,
                'addLabelIds': ['INBOX'],
                'removeLabelIds': ['TRASH']
            }), {'id': i}
        );
    }
    batchRequest.execute(callback);
}

gmail.prototype.readThreads = function(threads, callback) {
    var batchRequest = gapi.client.newBatch();
    for (i in threads) {
        batchRequest.add(
            gapi.client.gmail.users.threads.modify({
                'id': threads[i],
                'userId': this.email,
                'removeLabelIds': ['UNREAD']
            }), {'id': i}
        );
    }
    batchRequest.execute(callback);
}

gmail.prototype.unreadThreads = function(threads, callback) {
    var batchRequest = gapi.client.newBatch();
    for (i in threads) {
        batchRequest.add(
            gapi.client.gmail.users.threads.modify({
                'id': threads[i],
                'userId': this.email,
                'addLabelIds': ['UNREAD']
            }), {'id': i}
        );
    }
    batchRequest.execute(callback);
}

gmail.prototype.setAsSpam = function(threads, callback) {
    var batchRequest = gapi.client.newBatch();
    for (i in threads) {
        batchRequest.add(
            gapi.client.gmail.users.threads.modify({
                'userId': this.email,
                'id': threads[i],
                'addLabelIds': ['SPAM']
            }), {'id': i}
        );
    }

    batchRequest.execute(callback);
}

gmail.prototype.setAsNotSpam = function(threads, callback) {
    var batchRequest = gapi.client.newBatch();
    for (i in threads) {
        batchRequest.add(
            gapi.client.gmail.users.threads.modify({
                'userId': this.email,
                'id': threads[i],
                'addLabelIds': ['INBOX'],
                'removeLabelIds': ['SPAM'],
            }), {'id': i}
        );
    }

    batchRequest.execute(callback);
}

var gmail = new gmail('me');