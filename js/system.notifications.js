/**
 * Created by Andrés on 23/04/2015.
 */

system.prototype.initNotificationSystem = function () {
    this.enabled = false;

    if (Notification) {
        this.enabled = true;
        Notification.requestPermission();
    }
}

system.prototype.newNotification = function (text) {
    if (this.enabled) {
        Notification.requestPermission(function (permission) {
            new Notification("BlackMail", {body: text, icon: 'images/mail-open-64px.png', dir: 'auto'});
        });
    }
}