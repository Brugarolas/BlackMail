var clientId = '845333536022-mgv2v21pvnosl5p7dn3ccvu53hcpt2ga.apps.googleusercontent.com';
var apiKey = 'AIzaSyBWOyx1Ri2q5TkIwO-lMMzUovgUmunDryE';
var scopes = ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/gmail.readonly',
	'https://www.googleapis.com/auth/userinfo.email'];

var app = angular.module("app", []);

app.controller('GmailMainController', function($scope) {
	$scope.data = {
		loading: true,
		loadingMessage: "Loading API...",
		messageActive: -1,
		currentPage: 0,
		threadsPerPage: 20,
		showOverlay: false,
		showSidebar: false
	};

	$scope.handleClientLoad = function() {
		// Step 2A: Reference the API key
		$scope.gapi.client.setApiKey(apiKey);

		// Step 2B: Try to auth
		$scope.gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, $scope.handleAuthResult);
	}

	$scope.handleAuthResult = function(authResult) {
		$scope.data.loadingMessage = "Handling authorization...";

		var authorizeButton = document.getElementById('authorize-button');
		if (authResult && !authResult.error) {
			//Step 2C: If we auth, make API call
			authorizeButton.style.visibility = 'hidden';
			$scope.makeApiCall();
		} else {
			//Step 2D: If we can't auth, make authorize button visible
			$scope.gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, $scope.handleAuthResult);
		}
	}

	$scope.handleAuthClick = function(event) {
		// Step 3: Get authorization to use private data
		$scope.gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, $scope.handleAuthResult);
		return false;
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
					$scope.data.personalName = resp.result.displayName || $scope.data.personalEmail.substring(0, $scope.data.personalEmail.indexOf('@'));
				});

				//Step 7: Load the Gmail API and get list of threads
				gapi.client.load('gmail', 'v1', function() {
					if (storage.retrieveThreads($scope.data.personalEmail)) $scope.getListOfNewThreads();
					else $scope.getListOfAllThreads();
				});
			}, function(reason) {
				//Some error happened
				console.error(reason.result.error.message);
			});
		});
	}

	//Get list of new threads
	$scope.getListOfNewThreads = function(nextPageToken) {
		console.log("Getting list of new threads...");

		//Step 8: Assemble the API request
		var request;
		if (nextPageToken === 'undefined') {
			request = gapi.client.gmail.users.messages.list({
				'userId': $scope.data.personalEmail,
				'q': '!in:chats after:' + storage.getLastDate().toString('yyyy/MM/dd')
			});
		} else {
			request = gapi.client.gmail.users.messages.list({
				'userId': $scope.data.personalEmail,
				'pageToken': nextPageToken,
				'q': '!in:chats after:' + storage.getLastDate().toString('yyyy/MM/dd')
			});
		}

		//Step 9A: Execute API request and retrieve list of threads
		request.execute(function(response) {
			console.log(response);
			//Step 9A: Execute API request and retrieve list of threads
			var nuevos = storage.addMessagesToList(response.result.messages);

			console.log(nuevos.length + " new threads.");
			for (i in nuevos) console.log("\t" + nuevos[i].id);

			//Step 9C: If we have more pages with threads, request them
			//if (response.nextPageToken) {
			//	$scope.$apply(function() {
			//		$scope.data.loadingMessage = "Loading threads (" + storage.getNumOfThreads() + " threads loaded)...";
			//	});
			//	$scope.getListOfAllThreads(response.nextPageToken);
			//} else {
				//Step 9D: If we do not, start loading particular threads
				$scope.$apply(function() {
					$scope.data.numOfThreads = storage.getNumOfThreads();
					//$scope.data.loadingMessage = storage.saveThreads($scope.data.personalEmail);
					$scope.data.numOfPages = Math.ceil($scope.data.numOfThreads / $scope.data.threadsPerPage);
				});
				$scope.getPageThreads();
			//}
		}, function(reason) {
			//Some error happened
			console.error(reason.result.error.message);
		});
	}

	// Get list of threads
	$scope.getListOfAllThreads = function(nextPageToken) {
		//Step 8: Assemble the API request
		var request;
		if (nextPageToken === 'undefined') {
			request = gapi.client.gmail.users.threads.list({
				'userId': 'me',
				'q': '!in:chats'
			});
		} else {
			request = gapi.client.gmail.users.threads.list({
				'userId': 'me',
				'pageToken': nextPageToken,
				'q': '!in:chats'
			});
		}

		//Step 9A: Execute API request and retrieve list of threads
		request.execute(function(response) {
			//Step 9B. Save threads
			storage.addNewThreadsToList(response.threads);

			//Step 9C: If we have more pages with threads, request them
			if (response.nextPageToken) {
				$scope.$apply(function() {
					$scope.data.loadingMessage = "Loading threads (" + storage.getNumOfThreads() + " threads loaded)...";
				});
				$scope.getListOfAllThreads(response.nextPageToken);
			} else {
				//Step 9D: If we do not, start loading particular threads
				$scope.$apply(function() {
					$scope.data.numOfThreads = storage.getNumOfThreads();
					$scope.data.loadingMessage = storage.saveThreads($scope.data.personalEmail);
					$scope.data.numOfPages = Math.ceil($scope.data.numOfThreads / $scope.data.threadsPerPage);
				});
				$scope.getPageThreads();
			}
		}, function(reason) {
			//Some error happened
			console.error(reason.result.error.message);
		});
	}

	//Get threads
	$scope.getPageThreads = function() {
		var startingThread = $scope.data.currentPage * $scope.data.threadsPerPage;
		var currentThread = startingThread;
		var batchRequest = gapi.client.newBatch();

		$scope.data.loadingMessage = "Loading messages...";
		for (i = 0; i < $scope.data.threadsPerPage && currentThread < $scope.data.numOfThreads; i++) {
			batchRequest.add(
				gapi.client.gmail.users.threads.get({
					'userId': 'me',
					'id': storage.getThreadByIndex(currentThread).id,
					'format': 'metadata'
				}), {'id': currentThread}
			);

			currentThread = startingThread + (i + 1);
		}

		batchRequest.then(
			function(response) {
				var thread, result, firstThreadId = storage.getThreadByIndex(0).id;

				for (i in response.result) {
					result = response.result[i].result;
					thread = storage.getThreadByIndex(i);

					thread.subject = getThreadSubject(result);
					thread.snippet = getThreadSnippet(result);
					thread.unread = isThreadUnread(result);
					thread.date = Date.parse(getThreadDate(result));
					thread.sender = getSenderThread(result);
					thread.numOfMsgs = getNumOfMessages(result);
					thread.messages = [];

                    if ($scope.data.currentPage == 0 && thread.id == firstThreadId) {
                        storage.setLastDate($scope.data.personalEmail, thread.date);
                    }
				}

				$scope.$apply(function() {
					$scope.data.messageList = storage.getThreads(startingThread, $scope.data.threadsPerPage); //threads.slice(startingThread, startingThread + $scope.data.threadsPerPage);
					$scope.data.loading = false;

					/*var string = JSON.stringify(threads);
					console.log("Size of sample is " + getSizeBytes(string.length * 16));
					var compressed = LZString.compress(string);
					console.log("Size of compressed sample is " + getSizeBytes(compressed.length * 16));*/
				});

			}, function(reason) {
				//Some error happened
				console.log(reason);
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
				setTimeout(function() { $scope.showThread(index); }, 300);
			} else {
				//If not, we simply show new thread
				$scope.showThread(index);
			}
		}
	}

	$scope.showThread = function(index) {
		var startingThread = $scope.data.currentPage * $scope.data.threadsPerPage;
		var thread = storage.getThreadByIndex(startingThread + index);

		//If thread is currently in memory, we don't have to make a new API request
		if (thread.messages.length > 0) {
			$scope.data.activeThread = thread;
			$scope.data.messageActive = index;
			$scope.data.showOverlay = true;
			return;
		}

		var request = gapi.client.gmail.users.threads.get({
			'userId': 'me',
			'id': thread.id,
			'format': 'full'
		});

		request.execute(function (response) {
			console.dir(response);
            $scope.getMailHTML(thread, response.messages, 0);

			$scope.$apply(function () {
				$scope.data.messageActive = index;
				$scope.data.showOverlay = true;
			});
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

		batchRequest.then(function(response) {
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

		/*iframe.onload = function() {
			$('#' + id).iFrameResize({
				checkOrigin: false,
				enablePublicMethods: true
			});
		}*/

		setTimeout(function(){
			if (!loaded) iframe.height = (iframe.contentWindow.document.body.scrollHeight / 2) - 50;
		}, 32);

		iframe.onload = function() {
			loaded = true;
			iframe.height = iframe.contentWindow.document.body.scrollHeight;
		}
	}

	$scope.clickOnHideThread = function() {
		$scope.data.messageActive = -1;
		$scope.data.showOverlay = false;
	}

    $scope.clickOnToggleSidebar = function() {
        $scope.data.showOverlay = true;
        $scope.data.showSidebar = true;
    }

    $scope.clickOnOverlay = function() {
        $scope.data.showOverlay = false;
        $scope.data.messageActive = -1;
        $scope.data.showSidebar = false;
    }

    $scope.clickOnCheckbox = function(event, index) {
        event.stopImmediatePropagation();
    }

	$scope.clickPreviousPage = function() {
		if ($scope.data.currentPage > 0) $scope.data.currentPage--;
		$scope.data.loading = true;
		$scope.getPageThreads();
	}

	$scope.clickNextPage = function() {
		if ($scope.data.currentPage < $scope.data.numOfPages - 1) $scope.data.currentPage++;
		$scope.data.loading = true;
		$scope.getPageThreads();
	}
});

//Step 1: Start here
function handleLoad() {
	// Enable sexy scrollbars
	$('.nano').nanoScroller();

	// Get scope, set API and start client load
	var scope = angular.element(document.querySelector('body')).scope();
	scope.$apply(function(){
		scope.gapi = gapi;
		scope.handleClientLoad();
	});
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