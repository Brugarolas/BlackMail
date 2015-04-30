/**
 * Created by Usuario on 30/04/2015.
 */

function system() {
    //Check operating system
    this.operatingSystem = getOS();

    //Detect platform
    this.platform = (typeof process !== "undefined" && typeof require !== "undefined") ? "Node" : "Anything";
    if (this.platform == "Node") {
        this.platform = (typeof require('nw.gui') !== "undefined") ? "Node Webkit" : "Node.js";
    }

    //Init notifications & storage
    this.initNotificationSystem();
    this.initStorage();
}

system.prototype.isMobile = function() {
    var mobileOS = ["Android", "BlackBerry", "iOS", "Windows Phone"];
    for (i in mobileOS) if (this.operatingSystem == mobileOS[i]) return true;
    return false;
}

function getOS() {
    var userAgent = navigator.userAgent, OS = [
        { 'regex': /Android/i, 'name': "Android" },
        { 'regex': /BlackBerry/i, 'name': "BlackBerry" },
        { 'regex': /iPhone|iPad|iPod/i, 'name': "iOS" },
        { 'regex': /IEMobile/i, 'name': "Windows Phone" },
        { 'regex': /Windows/i, 'name': "Windows Desktop" }
    ];

    for (i in OS) {
        if (OS[i].regex.test(userAgent)) return OS[i].name;
    }
}