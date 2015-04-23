/**
 * Created by Andrés on 23/04/2015.
 */

function notificationSystem() {
    this.enabled = false;
    //var webkit = false;

    if (Notification) {
        this.enabled = true;
        Notification.requestPermission();
    }
}

notificationSystem.prototype.newNotification = function(text) {
    if (this.enabled) {
        Notification.requestPermission(function(permission) {
            new Notification("BlackMail", {body: text, icon:'images/mail-open-64px.png', dir:'auto'});
        });
    }
}

var notificationSystem = new notificationSystem();