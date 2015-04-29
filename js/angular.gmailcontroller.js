var clientId = '845333536022-mgv2v21pvnosl5p7dn3ccvu53hcpt2ga.apps.googleusercontent.com';
var apiKey = 'AIzaSyBWOyx1Ri2q5TkIwO-lMMzUovgUmunDryE';
var scopes = ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/gmail.readonly',
	'https://www.googleapis.com/auth/userinfo.email'];

var app = angular.module("app", ["styles"]);

app.controller('GmailMainController', function($scope, $controller) {
	$controller('StylesController', {$scope: $scope});
	$scope.data = {
		loading: true,
		loadingMessage: "Loading API...",
		currentPage: 0,
		threadsPerPage: 25
	};

	$scope.handleClientLoad = function() {
		// Step 2A: Reference the API key
		gapi.client.setApiKey(apiKey);

		// Step 2B: Try to auth
		gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, $scope.handleAuthResult);
	}

	$scope.handleAuthResult = function(authResult) {
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
	$scope.makeApiCall = function() {
		$scope.data.loadingMessage = "Loading profile information..."

		// Step 4: Load the Google+ API and OAtuh2.0
		gapi.client.load('plus', 'v1').then(function() {
			// Step 5: Assemble the API request
			var request = gapi.client.plus.people.get({
				'userId': 'me'
			});

			// Step 6A: Execute the API request and retrieve our profile information
			request.then(function(resp) {
				var image = resp.result.image.url.slice(0, resp.result.image.url.indexOf('?sz')) + '?sz=150';

				//Step 6B: Apply data
				$scope.$apply(function() {
					$scope.data.loadingMessage = "Displaying results on the screen...";
					$scope.data.personalPhoto = image;
					$scope.data.personalEmail = resp.result.emails[0].value;
					gmail.setEmail($scope.data.personalEmail);
					storage.setEmail($scope.data.personalEmail);
					$scope.data.personalName = resp.result.displayName || $scope.data.personalEmail.substring(0, $scope.data.personalEmail.indexOf('@'));
				});

				//Step 7: Load the Gmail API and get list of threads
				gapi.client.load('gmail', 'v1', function() {
					$scope.data.loadingMessage = "Retrieving stored data...";
					$scope.getListOfLabels();
				});
			}, function(reason) {
				//Some error happened
				console.error(reason.result.error.message);
			});
		});
	}

	$scope.getListOfLabels = function() {
		gmail.getLabelListRequest().execute(function(response) {
			storage.saveLabels(response.result.labels);

			if (storage.retrieveThreads($scope.data.personalEmail)) $scope.getListOfNewMessages();
			else $scope.getListOfAllThreads();
		});
	}

	//Get list of new threads
	$scope.getListOfNewMessages = function(nextPageToken, newMessages) {
		if (newMessages === undefined) newMessages = [];

		//Step 8: Assemble the API request & Step 9A: Execute API request and retrieve list of threads
		gmail.getNewMessagesRequest(storage.getLastDate(), nextPageToken).execute(function(response) {
			$scope.data.loadingMessage = "Getting new emails...";

			if (response.resultSizeEstimate != 0) {
				//Step 9A: Execute API request and retrieve list of threads
				var nuevos = storage.addMessagesToList(response.result.messages);

				//Step 9C: If we have more pages with threads, request them
				if (nuevos.length == response.result.messages.length && response.nextPageToken) {
					$scope.getListOfNewMessages(response.nextPageToken, newMessages.concat(nuevos));
				} else {
					newMessages = newMessages.concat(nuevos);
					storage.mergeThreadList(newMessages);
				}
			}

			// Check if we need to update some messages
			if (newMessages.length == 0) {
				storage.classifyThreads();

				$scope.$apply(function() {
					$scope.data.loadingMessage = storage.saveThreads($scope.data.personalEmail);
					$scope.setCategory({'id': "CATEGORY_PERSONAL", 'name': "Personal" });
					//$scope.updateMessages();
				});
				$scope.endLoading(1000);
			} else {
				$scope.getDataOfNewMessages(newMessages);
			}
		}, function(reason) {
			//Some error happened
			console.error(reason.result.error.message);
		});
	}

	$scope.getDataOfNewMessages = function(newMessages) {
		gmail.getNewMessagesBatchRequest(newMessages).execute(function(response) {
			for (i in response) storage.addMessageToThread(response[i].result);
			storage.classifyThreads();

			$scope.$apply(function() {
				$scope.data.loadingMessage = storage.saveThreads($scope.data.personalEmail);
				$scope.setCategory({'id': "CATEGORY_PERSONAL", 'name': "Personal" });
			});
			$scope.endLoading(1000);
		});
	}

	// Get list of threads
	$scope.getListOfAllThreads = function(nextPageToken) {
		//Step 8: Assemble the API request & Step 9A: Execute API request and retrieve list of threads
		gmail.getAllThreadsRequest(nextPageToken).execute(function(response) {
			//Step 9B. Save threads
			storage.addNewThreadsToList(response.threads);

			//Step 9C: If we have more pages with threads, request them
			if (response.nextPageToken) {
				$scope.$apply(function() {
					$scope.data.loadingMessage = "Indexing threads (" + storage.getNumOfThreads() + " threads indexed)...";
				});
				$scope.getListOfAllThreads(response.nextPageToken);
			} else {
				//Step 9D: If we do not, start loading particular threads
				$scope.getPageThreads();
			}
		}, function(reason) {
			//Some error happened
			console.error(reason.result.error.message);
		});
	}

	//Get threads
	$scope.getPageThreads = function(page) {
		if (!page) page = 0;
		var pagesToLoad = 100, numOfPages = Math.ceil(storage.getNumOfThreads() / pagesToLoad);

		gmail.getPageThreadsBatchRequest(page, pagesToLoad).then(
			function(response) {
				storage.addPageThreads(response.result);

				if (page < numOfPages - 1) {
					$scope.$apply(function() {
						var porc = roundToPorc((pagesToLoad * (page + 1)) / storage.getNumOfThreads());
						$scope.data.loadingMessage = "Loading threads (" + porc + "% threads loaded)...";
					});
					$scope.getPageThreads(page + 1);
				} else {
					storage.classifyThreads();

					$scope.$apply(function() {
						$scope.data.loadingMessage = storage.saveThreads($scope.data.personalEmail);
						$scope.setCategory({'id': "CATEGORY_PERSONAL", 'name': "Personal" });
					});
					$scope.endLoading(1000);
				}

			}, function(reason) {
				//Some error happened
				console.error(reason.result.error.message);
			}
		);
	}

	//Function to format date in HTML
	$scope.formatDateShort = function(date) {
		var today = Date.today();

		if (today.toString("yyyy") != date.toString("yyyy")) {
			return date.toString("MMMM").substr(0, 3) + ' ' +  date.toString("yyyy");
		} else if (today.toString("dd") != date.toString("dd")) {
			return date.toString("dd MMMM");
		}
		return date.toString("hh:mm tt");
	}

	//Step 11: If we click on a particular thread...
	$scope.clickOnThread = function(event, index) {
		//If we click on toggle button, nothing should happen
        if (event.target.tagName == "LABEL") {
            return;
        }

		//If we...
		if ($scope.data.messageActive != -1 && $scope.data.messageActive == index) {
			//Click on selected thread, we should unselect it
			$scope.data.messageActive = -1;
			$scope.data.showOverlay = false;
		} else {
			//If not, if...
			if ($scope.data.messageActive != -1) {
				//If there is a selected thread, we should unselect it and show new thread in 300ms
				$scope.data.messageActive = -1;
				$scope.data.showOverlay = false;
				$scope.showThread(index, 300);
			} else {
				//If not, we simply show new thread
				$scope.showThread(index);
			}
		}
	}

	$scope.showThread = function(index, timeout) {
		var thread = storage.getThreadByIndex($scope.data.currentPage * $scope.data.threadsPerPage + index, $scope.data.selectedLabel.id);
		if (!timeout) timeout = 0;

		//If thread is currently in memory, we don't have to make a new API request
		if (thread.messages.length > 0) {
			setTimeout(function() {
				$scope.$apply(function () {
					$scope.data.activeThread = thread;
					$scope.data.messageActive = index;
					$scope.data.showOverlay = true;
				});
			}, timeout);
			return;
		}

		gmail.getThreadRequest(thread.id).execute(function (response) {
			console.dir(response);
            $scope.getMailHTML(thread, response.messages, 0);

			setTimeout(function() {
				$scope.$apply(function () {
					$scope.data.messageActive = index;
					$scope.data.showOverlay = true;
				});
			}, timeout);
		}, function(reason) {
			//Some error happened
			console.error(reason.result.error.message);
		});
	}

	$scope.getMailHTML = function(thread, messages, indexMsg) {
        if (messages.length == indexMsg) {
			console.log("Finishing...")
            console.log(thread);

            $scope.$apply(function() {
                $scope.data.activeThread = thread;
            });
            return;
        }

		var email = { id: messages[indexMsg].id, html: '', images: [], attachments: [] }

		//Si no tiene partes...
		if (!messages[indexMsg].payload.parts) {
			if (messages[indexMsg].payload.mimeType == "text/html") {
				email.html = obtainMainHTML(messages[indexMsg].payload.body.data);
			} else {
				email.html = createMainHTML(messages[indexMsg].payload.body.data);
			}

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

	$scope.addImages = function(email, thread, messages, indexMsg) {
		gmail.getEmailImagesBatchRequest(email).then(function(response) {
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

	$scope.loadHTML = function(iframe, id, html) {
		var loaded = false;

		iframe.contentWindow.document.open('text/html', 'replace');
		iframe.contentWindow.document.write(html);
		iframe.contentWindow.document.close();

		//console.log($('#' + id));

		/*$('#' + id).iFrameResize({
			checkOrigin: false,
			enablePublicMethods: true
		});*/

		setTimeout(function(){
			if (!loaded) iframe.height = (iframe.contentWindow.document.body.scrollHeight / 2) - 50;
		}, 32);

		/*iframe.onload = function() {
			 $('#' + id).iFrameResize({
				 checkOrigin: false,
				 enablePublicMethods: true
			 });
		}*/

		iframe.onload = function() {
			loaded = true;
			iframe.height = iframe.contentWindow.document.body.scrollHeight;
		}
	}

	$scope.updateCategories = function() {
		$scope.data.categories = storage.getCategories();
		for (i in $scope.data.categories) {
			if ($scope.data.categories[i].id == $scope.data.selectedLabel.id) {
				$scope.data.categories.splice(i, 1);
				break;
			}
		}
	}

	$scope.updateMessages = function() {
		$scope.data.messageList = storage.getThreads($scope.data.currentPage, $scope.data.threadsPerPage, $scope.data.selectedLabel.id);
		$scope.data.numOfThreads = storage.getNumOfThreads($scope.data.selectedLabel.id);
		$scope.data.numOfPages = Math.ceil($scope.data.numOfThreads / $scope.data.threadsPerPage);
	}

	$scope.showCategoryMenu = function() {
		return ($scope.data.selectedLabel && $scope.data.selectedLabel.id.indexOf('CATEGORY_') == 0);
	}

	$scope.isActiveLabel = function(label) {
		if (label.id == "INBOX") return ($scope.data.selectedLabel.id.indexOf('CATEGORY_') == 0);
		else return (label.id == $scope.data.selectedLabel.id);
	}

	$scope.setCategory = function(category) {
		$scope.updateLabel(category);
		$scope.updateCategories();
	}

	$scope.setLabel = function(label) {
		if (label.category) $scope.setCategory(label.category);
		else $scope.updateLabel(label);
	}

	$scope.updateLabel = function(label) {
		$scope.data.selectedLabel = label;
		$scope.data.showMenu = false;
		$scope.currentPage = 0;
		$scope.updateMessages();
	}

	$scope.getNumShowingThreads = function() {
		return Math.min($scope.data.numOfThreads, $scope.data.threadsPerPage);
	}

	$scope.endLoading = function(timeout) {
		$scope.data.labels = storage.getDefaultLabels();

		if (!timeout) timeout = 0;
		setTimeout(function() {
			$scope.$apply(function () {
				$scope.data.loading = false;
			});
		}, timeout);
	}

	$scope.isImportant = function(labels) {
		for (i in labels) {
			if (labels[i] === "IMPORTANT") return true;
		}
		return false;
	}

	$scope.clickPreviousPage = function() {
		if ($scope.data.currentPage > 0)
			$scope.data.messageList = storage.getThreads(--$scope.data.currentPage, $scope.data.threadsPerPage, $scope.data.selectedLabel.id);
	}

	$scope.clickNextPage = function() {
		if ($scope.data.currentPage < $scope.data.numOfPages - 1)
			$scope.data.messageList = storage.getThreads(++$scope.data.currentPage, $scope.data.threadsPerPage, $scope.data.selectedLabel.id);
	}
});

//Step 1: Start here
function handleLoad() {
	// Get scope, set API and start client load
	var scope = angular.element(document.querySelector('body')).scope();
	scope.handleClientLoad();
}

app.directive('ngEmailIframe', function($compile) {
	return {
		controller: function($scope) {},
		link: function(scope, element, attrs, ctrl) {
			scope.loadHTML(element[0], attrs.id, attrs.ngEmailIframe);
		}
	}
});

app.directive('ngDownloadButton', function($compile) {
	return {
		controller: function($scope) {},
		link: function(scope, element, attrs, ctrl) {
			element[0].href = 'data:text/html;charset=utf-8,' + encodeURIComponent(attrs.ngDownloadButton);
		}
	}
});

