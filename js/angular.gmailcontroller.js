var clientId = '845333536022-mgv2v21pvnosl5p7dn3ccvu53hcpt2ga.apps.googleusercontent.com';
var apiKey = 'AIzaSyBWOyx1Ri2q5TkIwO-lMMzUovgUmunDryE';
var scopes = ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/gmail.compose',
	'https://www.googleapis.com/auth/gmail.modify', 'https://www.google.com/m8/feeds'];

var app = angular.module("app", ["styles"]);

app.controller('GmailMainController', function ($scope, $controller, $timeout) {
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

        /* Load Google+ API*/
        system.loadGoogleAPI('plus', 'v1', function() {
            /* Get personal data */
            system.getPersonalData(150, function(personalData) {
                $scope.safeApply(function () {
                    $scope.data.personal = personalData;
                });

                /* Load Gmail API */
                system.loadGoogleAPI('gmail', 'v1', function() {
                    $scope.data.loadingMessage = "Retrieving stored data...";
                    $scope.getListOfLabels();
                }, $scope.defaultErrorCallback);
            }, $scope.defaultErrorCallback);
        }, $scope.defaultErrorCallback);
    }

    $scope.getListOfLabels = function () {
        system.getLabelList(function (labels) {
            system.retrieveThreads($scope.partialSync, $scope.fullSync);
        });
    }

    // Get list of threads
    $scope.fullSync = function () {
        system.performFullSync(function () {
            $scope.safeApply(function() {
                $scope.data.loadingMessage = "Indexing threads (" + system.storage.getNumOfThreads() + " threads indexed)...";
            });
        }, $scope.getPageThreads, $scope.defaultErrorCallback);
    }

    //Get threads
    $scope.getPageThreads = function () {
        var threadsPerPage = 100;
        system.getPageThreads(threadsPerPage, function (actualPage) {
            var porc = roundToPorc((threadsPerPage * actualPage) / system.storage.getNumOfThreads());
            $scope.safeApply(function () {
                $scope.data.loadingMessage = "Loading threads (" + porc + "% threads loaded)...";
            });
        }, function() {
            $scope.endLoading(1000);
        }, $scope.defaultErrorCallback);
    }

    $scope.partialSync = function() {
        $scope.safeApply(function() {
            $scope.data.loadingMessage = "Getting new emails...";
        });

        system.performPartialSync(100, function() { $scope.endLoading(1000); }, $scope.defaultErrorCallback);
    }

    $scope.showThread = function (index, timeout) {
        var threadIndex = $scope.data.currentPage * $scope.data.threadsPerPage + index;
        system.getThread(threadIndex, $scope.data.selectedLabel.id, $scope.safeUpdateMessages, function (thread) {
            $scope.$broadcast('rebuild-scrollbar-thread');
            $scope.safeApply(function () {
                $scope.data.activeThread = thread;
            });
            $timeout(function () {
                $scope.data.messageActive = index;
                $scope.data.showOverlay = true;
            }, (!timeout) ? 0 : timeout);
        }, $scope.defaultErrorCallback);
    }

    $scope.updateCategories = function () {
        $scope.data.categories = system.storage.getCategories();
        for (i in $scope.data.categories) {
            if ($scope.data.categories[i].id == $scope.data.selectedLabel.id) {
                $scope.data.categories.splice(i, 1); break;
            }
        }
    }

    $scope.showCategoryMenu = function () {
        return ($scope.data.selectedLabel && $scope.data.selectedLabel.id.indexOf('CATEGORY_') == 0);
    }

    $scope.setCategory = function (category) {
        $scope.updateLabel(category);
        $scope.updateCategories();
    }

    $scope.setLabel = function (label) {
        if (label.category) $scope.setCategory(label.category);
        else $scope.updateLabel(label);
    }

    $scope.getActualPageTextBig = function () {
        return ($scope.data.numOfPages == 0) ? "No messages" : "Showing " + Math.min($scope.data.numOfThreads, $scope.data.threadsPerPage) +
            " out of " + $scope.data.numOfThreads + " messages (page " + ($scope.data.currentPage+1) + " of " + $scope.data.numOfPages + ")";
    }

    $scope.getActualPageTextSmall = function () {
        return ($scope.data.numOfPages == 0) ? "0/0" : ($scope.data.currentPage+1) + "/" + $scope.data.numOfPages;
    }

    $scope.clickOnStar = function (event, index) {
        event.stopImmediatePropagation();
        var thread = system.getThreadByIndex($scope.data.currentPage * $scope.data.threadsPerPage + index, $scope.data.selectedLabel.id);
        if ($scope.isImportant(thread.labels)) $scope.modifyThreads([thread.id], [], ['IMPORTANT']);
        else $scope.modifyThreads([thread.id], ['IMPORTANT'], []);
    }

    $scope.clickPreviousPage = function () {
        if ($scope.data.currentPage > 0) {
			$scope.data.messageList = system.storage.getThreads(--$scope.data.currentPage, $scope.data.threadsPerPage, $scope.data.selectedLabel.id);
			$scope.changePageOrLabel();
		}
    }

    $scope.clickNextPage = function () {
        if ($scope.data.currentPage < $scope.data.numOfPages - 1) {
			$scope.data.messageList = system.storage.getThreads(++$scope.data.currentPage, $scope.data.threadsPerPage, $scope.data.selectedLabel.id);
            $scope.changePageOrLabel();
		}
    }

    $scope.checkValidNewEmail = function() {
        if ($scope.data.newMessage.email && $scope.data.newMessage.subject && $scope.data.newMessage.message) $scope.data.newMailValid = true;
        else $scope.data.newMailValid = false;
    }

    $scope.sendEmail = function () {
        if ($scope.data.newMailValid) {
            $scope.data.sendingEmail = true;
            system.sendMessage($scope.data.newMessage.email, $scope.data.newMessage.subject, $scope.data.newMessage.message, $scope.sentNewMessage, $scope.defaultErrorCallback);
        }
    }

    $scope.getSelectedIds = function () {
        var threads = [], starting = $scope.data.currentPage * $scope.data.threadsPerPage, label = $scope.data.selectedLabel.id;
        for (var n = 0; n < $scope.data.threadsPerPage; n++) if ($scope.data.selectedCheckboxes[n]) threads.push(system.storage.getThreadByIndex(starting + n, label).id);
        return threads;
    }

    $scope.modifySelectedThreads = function (addLabels, removeLabels) {
        system.modifyThreads($scope.getSelectedIds(), addLabels, removeLabels, $scope.safeUpdateMessages, $scope.defaultErrorCallback);
    }

    /** FORMAT FUNCTIONS **/
    //Function to format date in HTML
    $scope.formatDateThread = function (thread) {
        var date = (!$scope.data.selectedLabel.id.indexOf('SENT')) ? thread.dateSent : thread.date, today = Date.today();

        if (today.toString("yyyy") != date.toString("yyyy")) return date.toString("MMMM").substr(0, 3) + ' ' + date.toString("yyyy");
        else if (today.toString("dd") != date.toString("dd")) return date.toString("dd MMMM");
        return date.toString("hh:mm tt");
    }

    $scope.isImportant = function (labels) {
        for (i in labels) if (labels[i] === "IMPORTANT") return true;
        return false;
    }

    $scope.isActiveLabel = function (label) {
        if (label.id == "INBOX") return ($scope.data.selectedLabel && $scope.data.selectedLabel.id.indexOf('CATEGORY_') == 0);
        else return ($scope.data.selectedLabel && label.id == $scope.data.selectedLabel.id);
    }

    /** CALLBACKS **/
    $scope.safeApply = function (callback) {
        $timeout(callback, 5);
    }

    $scope.updateMessages = function () {
        $scope.data.messageList = system.storage.getThreads($scope.data.currentPage, $scope.data.threadsPerPage, $scope.data.selectedLabel.id);
        $scope.data.numOfThreads = system.storage.getNumOfThreads($scope.data.selectedLabel.id);
        $scope.data.numOfPages = Math.ceil($scope.data.numOfThreads / $scope.data.threadsPerPage);
        if ($scope.data.currentPage >= $scope.data.numOfPages) $scope.data.currentPage = $scope.data.numOfPages - 1;
    }

    $scope.updateLabel = function (label) {
        $scope.data.selectedLabel = label;
        $scope.data.showMenu = false;
        $scope.data.currentPage = 0;
        $scope.updateMessages();
        $scope.changePageOrLabel();
    }

    $scope.changePageOrLabel = function () {
        $scope.$broadcast('rebuild-scrollbar-list');
        $scope.data.selectedCheckboxes = [];
    }

    $scope.endLoading = function (timeout) {
        system.storage.classifyThreads();
        $scope.safeApply(function () {
            $scope.data.loadingMessage = system.storage.saveThreads();
            $scope.setCategory({'id': "CATEGORY_PERSONAL", 'name': "Personal", 'class': 'fa-envelope-square'});
        });

        $scope.data.labels = system.storage.getDefaultLabels();
        $timeout(function () { $scope.data.loading = false; }, (!timeout) ? 0 : timeout);
    }

    $scope.safeUpdateMessages = function() {
        $scope.safeApply($scope.updateMessages);
    }

    $scope.sentNewMessage = function () {
        $scope.safeApply(function () {
            $scope.updateMessages();
            $scope.data.newMessage = {};
            $scope.data.sendingEmail = false;
            $scope.data.showCompose = false;
        });
    }

    $scope.defaultErrorCallback = function (response) {
        $scope.safeApply(function () {
            $scope.data.loadingMessage = "There has been an error. Please check console."
        });
        console.log("***** ERROR *****");
        console.log(response);
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

app.directive('ngDownloadFile', function ($compile) {
    return {
        controller: function ($scope) { },
        link: function (scope, element, attrs, ctrl) {
            system.getFileAttachment(attrs.ngDownloadFile, function (attachment) {
                element[0].href = 'data:' + attachment.mime + ';' + attachment.encoding + ',' + attachment.data;
                element[0].innerHTML = attachment.name; element[0].download = attachment.name;
            }, function (error) {
                element[0].innerHTML = "** ERROR **";
                console.log(error);
            });
        }
    }
});

