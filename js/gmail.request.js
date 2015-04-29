/**
 * Created by Andrés on 22/04/2015.
 */

function gmail(email) {
    this.email = email;
}

gmail.prototype.setEmail = function(email) {
    this.email = email;
}

gmail.prototype.getEmail = function() {
    return this.email;
}

gmail.prototype.getNewMessagesRequest = function(lastDate, nextPageToken) {
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

gmail.prototype.getAllThreadsRequest = function(nextPageToken) {
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

gmail.prototype.getPageThreadsBatchRequest = function(currentPage, threadsPerPage) {
    var startingThread = currentPage * threadsPerPage;
    var lastPage = Math.min(startingThread + threadsPerPage, storage.getNumOfThreads());
    var batchRequest = gapi.client.newBatch();

    for (i = startingThread; i < lastPage; i++) {
        batchRequest.add(
            gapi.client.gmail.users.threads.get({
                'userId': this.email,
                'id': storage.getThreadByIndex(i).id,
                'format': 'metadata'
            }), {'id': i }
        );
    }

    return batchRequest;
}

gmail.prototype.getNewMessagesBatchRequest = function(newMessages) {
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

gmail.prototype.getEmailImagesBatchRequest = function(email) {
    var batchRequest = gapi.client.newBatch();

    for (i in email.images) {
        batchRequest.add(
            gapi.client.gmail.users.messages.attachments.get({
                'id': email.images[i].body.attachmentId,
                'messageId': email.id,
                'userId': 'me'
            }), {'id': i }
        );
    }

    return batchRequest;
}

gmail.prototype.getThreadRequest = function(id) {
    return gapi.client.gmail.users.threads.get({
        'userId': this.email,
        'id': id,
        'format': 'full'
    });
}

gmail.prototype.getLabelListRequest = function() {
    return gapi.client.gmail.users.labels.list({
        'userId': this.email
    });
}

var gmail = new gmail('me');