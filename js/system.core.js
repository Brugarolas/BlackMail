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

System.prototype.loadGoogleAPI = function (apiName, version, callback, error) {
    system.network.loadAPI(apiName, version, callback, error);
}

System.prototype.getPersonalData = function (imageSize, callback, error) {
    if (!this.storage.getPersonalData())
        system.network.getPersonalData(function(response) {
            system.storage.savePersonalData(response.result, imageSize);
            system.network.setEmail(system.storage.getEmail());

            callback(system.storage.getPersonalData());
        }, error);
    else callback(system.storage.getPersonalData());
}

System.prototype.getLabelList = function (callback, error) {
    if (system.storage.labels.length == 0)
        system.network.getLabelList(function(response) {
            system.storage.saveLabels(response.result.labels);
            callback(system.storage.getLabels());
        }, error);
    else callback(system.storage.getLabels());
}

System.prototype.retrieveThreads = function (callbackRetrieve, callbackInexistant) {
    if (system.storage.retrieveThreads()) callbackRetrieve();
    else callbackInexistant();
}

System.prototype.performFullSync = function (between, end, error) {
    var next = function (response) {
        system.storage.addNewThreadsToList(response.threads); between();
        if (response.nextPageToken) system.network.getAllThreadsIds(next, error, response.nextPageToken); else end();
    }
    system.network.getAllThreadsIds(next, error);
}

System.prototype.getPageThreads = function (threadsPerPage, between, end, error) {
    var numOfPages = Math.ceil(system.storage.getNumOfThreads() / threadsPerPage), steps = [], actualPage = 0;
    for (var page = 0; page < numOfPages; page++) steps.push(system.storage.getThreads(page, threadsPerPage));
    var next = function (response) {
        system.storage.addMetadataToThreads(response); actualPage += 1; between(actualPage);
        if (actualPage < numOfPages) system.network.getPageThreads(steps[actualPage], next, error); else end();
    }
    system.network.getPageThreads(steps[0], next, error);
}

System.prototype.performPartialSync = function (between, end, error) {
    var newMessages = [], next = function (response) {
        if (response.resultSizeEstimate != 0) {
            var nuevos = system.storage.addMessagesToList(response.result.messages);
            newMessages = newMessages.concat(nuevos);

            if (nuevos.length == response.result.messages.length && response.nextPageToken)
                system.network.getNewMessages(next, error, system.prototype.getLastDate(), response.nextPageToken);
            else { console.log(newMessages); end(); }//system.storage.mergeThreadList(newMessages);

            /*if (newMessages.length == 0) $scope.endLoading(1000);
            else $scope.getDataOfNewMessages(newMessages);*/
        }
    }
    system.network.getNewMessages(next, error, system.storage.getLastDate());
}

System.prototype.getNewMessages = function (newMessages) {

}