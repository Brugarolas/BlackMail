var clientId = '845333536022-mgv2v21pvnosl5p7dn3ccvu53hcpt2ga.apps.googleusercontent.com';
var apiKey = 'AIzaSyBWOyx1Ri2q5TkIwO-lMMzUovgUmunDryE';
var scopes = ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/gmail.compose',
	'https://www.googleapis.com/auth/gmail.modify'];

var app = angular.module("app", ["styles"]);

//Init notifications & storage
system.initNotificationSystem();
system.initStorage();

app.controller('GmailMainController', function ($scope, $controller) {
    $controller('StylesController', {$scope: $scope});
    $scope.data = {
        loading: true,
        loadingMessage: "Loading API...",
        currentPage: 0,
        threadsPerPage: 25,
		newMessage: {},
		selectedCheckboxes: [],
		sendingEmail: false,
        newMailValid: false
    };

    $scope.handleClientLoad = function () {
        // Step 2A: Reference the API key
        gapi.client.setApiKey(apiKey);

        // Step 2B: Try to auth
        gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, $scope.handleAuthResult);
    }

    $scope.handleAuthResult = function (authResult) {
        $scope.data.loadingMessage = "Handling authorization...";

        if (authResult && !authResult.error) {
            //Step 2C: If we auth, make API call
            $scope.makeApiCall();
        } else {
            // Step 3: Get authorization to use private data
            gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, $scope.handleAuthResult);
        }
    }

    // Load the API and make an API call.  Display the results on the screen.
    $scope.makeApiCall = function () {
        $scope.data.loadingMessage = "Loading profile information..."

        // Step 4: Load the Google+ API and OAtuh2.0
        gapi.client.load('plus', 'v1').then(function () {
            // Step 5: Assemble the API request
            var request = gapi.client.plus.people.get({
                'userId': 'me'
            });

            // Step 6A: Execute the API request and retrieve our profile information
            request.then(function (resp) {
                var image = resp.result.image.url.slice(0, resp.result.image.url.indexOf('?sz')) + '?sz=150';

                //Step 6B: Apply data
                $scope.$apply(function () {
                    $scope.data.personalPhoto = image;
                    $scope.data.personalEmail = resp.result.emails[0].value;
                    gmail.setEmail($scope.data.personalEmail);
                    system.setEmail($scope.data.personalEmail);
                    $scope.data.personalName = resp.result.displayName || $scope.data.personalEmail.substring(0, $scope.data.personalEmail.indexOf('@'));
                });

                //Step 7: Load the Gmail API and get list of threads
                gapi.client.load('gmail', 'v1', function () {
                    $scope.data.loadingMessage = "Retrieving stored data...";
                    $scope.getListOfLabels();
                });
            }, function (reason) {
                //Some error happened
                console.error(reason.result.error.message);
            });
        });
    }

    $scope.getListOfLabels = function () {
        gmail.getLabelListRequest().execute(function (response) {
            system.saveLabels(response.result.labels);

            if (system.retrieveThreads($scope.data.personalEmail)) $scope.getListOfNewMessages();
            else $scope.getListOfAllThreads();
        });
    }

    //Get list of new threads
    $scope.getListOfNewMessages = function (nextPageToken, newMessages) {
        if (newMessages === undefined) newMessages = [];

        //Step 8: Assemble the API request & Step 9A: Execute API request and retrieve list of threads
        gmail.getNewMessagesRequest(system.getLastDate(), nextPageToken).execute(function (response) {
            $scope.data.loadingMessage = "Getting new emails...";

            if (response.resultSizeEstimate != 0) {
                //Step 9A: Execute API request and retrieve list of threads
                var nuevos = system.addMessagesToList(response.result.messages);

                //Step 9C: If we have more pages with threads, request them
                if (nuevos.length == response.result.messages.length && response.nextPageToken) {
                    $scope.getListOfNewMessages(response.nextPageToken, newMessages.concat(nuevos));
                } else {
                    newMessages = newMessages.concat(nuevos);
                    system.mergeThreadList(newMessages);
                }
            }

            // Check if we need to update some messages
            if (newMessages.length == 0) $scope.endLoading(1000);
            else $scope.getDataOfNewMessages(newMessages);

        }, function (reason) {
            //Some error happened
            console.error(reason.result.error.message);
        });
    }

    $scope.getDataOfNewMessages = function (newMessages) {
        gmail.getNewMessagesBatchRequest(newMessages).execute(function (response) {
            for (i in response) system.addMessageToThread(response[i].result);
            $scope.endLoading(1000);
        });
    }

    // Get list of threads
    $scope.getListOfAllThreads = function (nextPageToken) {
        //Step 8: Assemble the API request & Step 9A: Execute API request and retrieve list of threads
        gmail.getAllThreadsRequest(nextPageToken).execute(function (response) {
            //Step 9B. Save threads
            system.addNewThreadsToList(response.threads);

            //Step 9C: If we have more pages with threads, request them
            if (response.nextPageToken) {
                $scope.$apply(function () {
                    $scope.data.loadingMessage = "Indexing threads (" + system.getNumOfThreads() + " threads indexed)...";
                });
                $scope.getListOfAllThreads(response.nextPageToken);
            } else {
                //Step 9D: If we do not, start loading particular threads
                $scope.getPageThreads();
            }
        }, function (reason) {
            //Some error happened
            console.error(reason.result.error.message);
        });
    }

    //Get threads
    $scope.getPageThreads = function (page) {
        if (!page) page = 0;
        var pagesToLoad = 100, numOfPages = Math.ceil(system.getNumOfThreads() / pagesToLoad);

        gmail.getPageThreadsBatchRequest(page, pagesToLoad).then(
            function (response) {
                system.addPageThreads(response.result);

                if (page < numOfPages - 1) {
                    $scope.$apply(function () {
                        var porc = roundToPorc((pagesToLoad * (page + 1)) / system.getNumOfThreads());
                        $scope.data.loadingMessage = "Loading threads (" + porc + "% threads loaded)...";
                    });
                    $scope.getPageThreads(page + 1);
                } else $scope.endLoading(1000);

            }, function (reason) {
                //Some error happened
                console.error(reason.result.error.message);
            }
        );
    }

    //Function to format date in HTML
    $scope.formatDateShort = function (date) {
        var today = Date.today();

        if (today.toString("yyyy") != date.toString("yyyy")) {
            return date.toString("MMMM").substr(0, 3) + ' ' + date.toString("yyyy");
        } else if (today.toString("dd") != date.toString("dd")) {
            return date.toString("dd MMMM");
        }
        return date.toString("hh:mm tt");
    }

    $scope.showThread = function (index, timeout) {
        var thread = system.getThreadByIndex($scope.data.currentPage * $scope.data.threadsPerPage + index, $scope.data.selectedLabel.id);
        if (!timeout) timeout = 0;

        if (index < 0 || thread.messages.length > 0) {
            //If thread is currently in memory, we don't have to make a new API request
            setTimeout(function () {
                $scope.$apply(function () {
                    if (index > -1) $scope.data.activeThread = thread;
                    $scope.data.messageActive = index;
                    $scope.data.showOverlay = (index > -1);
                });
            }, timeout);
        } else {
            //If not, we need to make a request
            gmail.getThreadRequest(thread.id).execute(function (response) {
                console.log(response);
                $scope.getMailHTML(thread, response.messages, 0);

                setTimeout(function () {
                    $scope.$apply(function () {
                        $scope.data.messageActive = index;
                        $scope.data.showOverlay = true;
                    });
                }, timeout);
            }, function (reason) {
                //Some error happened
                console.error(reason.result.error.message);
            });

            //Mark message as read if needed
            var indexOf = thread.labels.indexOf('UNREAD');
            if (indexOf > -1) {
                gmail.readThreads([thread.id], function (response) {
                    console.log(response);
                    //system.deleteLabelFromThread([thread.id], 'UNREAD');
                    system.updateLabels(response);
                    $scope.$apply(function () {
                        $scope.updateMessages();
                    });
                    system.saveThreads();
                });
            }
        }
    }

    $scope.getMailHTML = function (thread, messages, indexMsg) {
        if (messages.length == indexMsg) {
            console.log("Finishing...")
            console.log(thread);

            $scope.$apply(function () {
                $scope.data.activeThread = thread;
            });
        } else {
            var email = {id: messages[indexMsg].id, html: '', images: [], attachments: []}

            //Si no tiene partes...
            if (!messages[indexMsg].payload.parts) {
                var funcHTML = (messages[indexMsg].payload.mimeType == "text/html") ? obtainMainHTML : createMainHTML;
                email.html = funcHTML(messages[indexMsg].payload.body.data);

                thread.messages.push(email);
                $scope.getMailHTML(thread, messages, indexMsg + 1);
            } else {
                console.log(messages[indexMsg].payload);
                parsePayload(email, messages[indexMsg].payload);

                if (email.images.length > 0) {
                    $scope.addImages(email, thread, messages, indexMsg);
                } else {
                    thread.messages.push(email);
                    $scope.getMailHTML(thread, messages, indexMsg + 1);
                }
            }
        }
    }

    $scope.addImages = function (email, thread, messages, indexMsg) {
        gmail.getEmailImagesBatchRequest(email).then(function (response) {
            var data, src;
            for (i in response.result) {
                data = response.result[i].result.data.replace(/-/g, '+').replace(/_/g, '/');
                src = getImageSrcToReplace(email.images[i]);

                console.log(src);

                email.html = email.html.replace(src, 'data:' + email.images[i].mimeType + ';charset=utf-8;base64,' + data);
            }

            thread.messages.push(email);
            $scope.getMailHTML(thread, messages, indexMsg + 1);
        });
    }

    $scope.updateCategories = function () {
        $scope.data.categories = system.getCategories();
        for (i in $scope.data.categories) {
            if ($scope.data.categories[i].id == $scope.data.selectedLabel.id) {
                $scope.data.categories.splice(i, 1); break;
            }
        }
    }

    $scope.updateMessages = function () {
        $scope.data.messageList = system.getThreads($scope.data.currentPage, $scope.data.threadsPerPage, $scope.data.selectedLabel.id);
        $scope.data.numOfThreads = system.getNumOfThreads($scope.data.selectedLabel.id);
        $scope.data.numOfPages = Math.ceil($scope.data.numOfThreads / $scope.data.threadsPerPage);
        if ($scope.data.currentPage >= $scope.data.numOfPages) $scope.data.currentPage = $scope.data.numOfPages - 1;
		$scope.data.selectedCheckboxes = [];
    }

    $scope.showCategoryMenu = function () {
        return ($scope.data.selectedLabel && $scope.data.selectedLabel.id.indexOf('CATEGORY_') == 0);
    }

    $scope.isActiveLabel = function (label) {
        if (label.id == "INBOX") return ($scope.data.selectedLabel.id.indexOf('CATEGORY_') == 0);
        else return (label.id == $scope.data.selectedLabel.id);
    }

    $scope.setCategory = function (category) {
        $scope.updateLabel(category);
        $scope.updateCategories();
    }

    $scope.setLabel = function (label) {
        if (label.category) $scope.setCategory(label.category);
        else $scope.updateLabel(label);
    }

    $scope.updateLabel = function (label) {
        $scope.data.selectedLabel = label;
        $scope.data.showMenu = false;
        $scope.data.currentPage = 0;
        $scope.updateMessages();
    }

    $scope.getActualPageTextBig = function () {
        return ($scope.data.numOfPages == 0) ? "No messages" : "Showing " + Math.min($scope.data.numOfThreads, $scope.data.threadsPerPage) +
            " out of " + $scope.data.numOfThreads + " messages (page " + ($scope.data.currentPage+1) + " of " + $scope.data.numOfPages + ")";
    }

    $scope.getActualPageTextSmall = function () {
        return ($scope.data.numOfPages == 0) ? "0/0" : ($scope.data.currentPage+1) + "/" + $scope.data.numOfPages;
    }

    $scope.endLoading = function (timeout) {
        system.classifyThreads();
        $scope.$apply(function () {
            $scope.data.loadingMessage = system.saveThreads();
            $scope.setCategory({'id': "CATEGORY_PERSONAL", 'name': "Personal", 'class': 'fa-envelope-square'});
        });

        $scope.data.labels = system.getDefaultLabels();
        if (!timeout) timeout = 0;
        setTimeout(function () {
            $scope.$apply(function () {
                $scope.data.loading = false;
            });
        }, timeout);
    }

    $scope.isImportant = function (labels) {
        for (i in labels) if (labels[i] === "IMPORTANT") return true;
        return false;
    }

    $scope.clickPreviousPage = function () {
        if ($scope.data.currentPage > 0) {
			$scope.data.messageList = system.getThreads(--$scope.data.currentPage, $scope.data.threadsPerPage, $scope.data.selectedLabel.id);
			$scope.data.selectedCheckboxes = [];
		}
    }

    $scope.clickNextPage = function () {
        if ($scope.data.currentPage < $scope.data.numOfPages - 1) {
			$scope.data.messageList = system.getThreads(++$scope.data.currentPage, $scope.data.threadsPerPage, $scope.data.selectedLabel.id);
			$scope.data.selectedCheckboxes = [];
		}
    }

    $scope.checkValidNewEmail = function() {
        if ($scope.data.newMessage.email && $scope.data.newMessage.subject && $scope.data.newMessage.message) $scope.data.newMailValid = true;
        else $scope.data.newMailValid = false;
    }

	$scope.sendEmail = function () {
		if ($scope.data.newMessage.email && $scope.data.newMessage.subject && $scope.data.newMessage.message) {
			$scope.data.sendingEmail = true;
			gmail.sendMessage($scope.data.newMessage.email, $scope.data.newMessage.subject, $scope.data.newMessage.message, function (message) {
                gmail.getThreadRequest(message.threadId).execute(function(response) {
                    system.addOrUpdateThread(response.result);

                    $scope.$apply(function () {
                        $scope.updateMessages();
                        $scope.data.newMessage = {};
                        $scope.data.sendingEmail = false;
                        $scope.data.showCompose = false;
                    });
                });
			});
		}
	}

    $scope.getSelectedIds = function () {
        var threads = [], starting = $scope.data.currentPage * $scope.data.threadsPerPage, label = $scope.data.selectedLabel.id;
        for (var n = 0; n < $scope.data.threadsPerPage; n++) if ($scope.data.selectedCheckboxes[n]) threads.push(system.getThreadByIndex(starting + n, label).id);
        return threads;
    }

    $scope.markRead = function () {
        var threads = $scope.getSelectedIds();
        if (threads.length > 0) gmail.readThreads(threads, function (response) {
            system.updateLabels(response);

            $scope.$apply(function () {
                $scope.updateMessages();
                $scope.data.selectedCheckboxes = [];
            });
        });
    }

    $scope.markUnread = function () {
        var threads = $scope.getSelectedIds();
        if (threads.length > 0) gmail.unreadThreads(threads, function (response) {
            system.updateLabels(response);

            $scope.$apply(function () {
                $scope.updateMessages();
                $scope.data.selectedCheckboxes = [];
            });
        });
    }

	$scope.selectedToTrash = function () {
        var threads = $scope.getSelectedIds();
        if (threads.length > 0) gmail.getSendThreadToTrashBatch(threads, function (response) {
            system.updateLabels(response);

            $scope.$apply(function () {
                $scope.updateMessages();
                $scope.data.selectedCheckboxes = [];
            });
        });
    }

    $scope.selectedRetrieveFromTrash = function () {
        var threads = $scope.getSelectedIds();
        if (threads.length > 0) gmail.getRetrieveFromTrashBatch(threads, function (response) {
            system.updateLabels(response);

            $scope.$apply(function () {
                $scope.updateMessages();
                $scope.data.selectedCheckboxes = [];
            });
        });
    }

    $scope.selectedMarkAsSpam = function () {
        var threads = $scope.getSelectedIds();
        if (threads.length > 0) gmail.setAsSpam(threads, function (response) {
            system.updateLabels(response);

            $scope.$apply(function () {
                $scope.updateMessages();
                $scope.data.selectedCheckboxes = [];
            });
        });
    }

    $scope.selectedMarkAsNotSpam = function () {
        var threads = $scope.getSelectedIds();
        if (threads.length > 0) gmail.setAsNotSpam(threads, function (response) {
            system.updateLabels(response);

            $scope.$apply(function () {
                $scope.updateMessages();
                $scope.data.selectedCheckboxes = [];
            });
        });
    }
});

//Step 1: Start here
function handleLoad() {
    // Get scope, set API and start client load
    var scope = angular.element(document.querySelector('body')).scope();
    scope.handleClientLoad();
}

app.directive('ngDownloadButton', function ($compile) {
    return {
        controller: function ($scope) { },
        link: function (scope, element, attrs, ctrl) {
            element[0].href = 'data:text/html;charset=utf-8,' + encodeURIComponent(attrs.ngDownloadButton);
        }
    }
});

