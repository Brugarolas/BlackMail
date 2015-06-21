/**
 * Created by Andr�s on 06/04/2015.
 */
"use strict";

function obtainMainHTML(content) {
    var html = Base64.decode(content);

    //html = html.replace(/([^-]|^)(width: *\d*px;?)/igm, "$1");

    return html.replace("<head>", "<head> \n\t<base target='_blank'>");
    //return html.replace("<head>", "<head> \n\t<base target='_blank'> \n\t<script src='js/libs/iframeResizer.contentWindow.min.js'></script>");
}

function createMainHTML(content) {
    var re_weburl = new RegExp(
        "((?:(?:https?|ftp)://)?" +
            // user:pass authentication
        "(?:\\S+(?::\\S*)?@)?" +
        "(?:" +
            // IP address exclusion
            // private & local networks
        "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
        "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
        "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
            // IP address dotted notation octets
            // excludes loopback network 0.0.0.0
            // excludes reserved space >= 224.0.0.0
            // excludes network & broacast addresses
            // (first & last IP address of each class)
        "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
        "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
        "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
        "|" +
            // host name
        "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
            // domain name
        "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
            // TLD identifier
        "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
        ")" +
            // port number
        "(?::\\d{2,5})?" +
            // resource path
        "(?:/\\S*)?)", "igm"
    );

    var text = Base64.decode(content).replace(/(\n)/g, '<br>');
    //var text = Base64.decode(content).replace(/(\n)/g, '<br>').replace(re_weburl, getLink("$1"));
    // ("$1".indexOf("http") == 0) ? "<a href='$1'>$1</a>" :
    //     (("$1".indexOf("@") > -1) ? "<a href='mailto:$1'>$1</a>" : "<a href='http://$1'>$1</a>"));

    return "<!DOCTYPE html> \
            <html> \
                <head> \
                    <meta charset='utf-8'> \
                    <title>Email</title> \
                    <base target='_blank'> \
                    <meta name='description' content='Reading email...'> \
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'> \
                </head> \
                <body> \
                    " + text + " \
                </body> \
            </html>";
}

function getSizeBytes(size) {
    var metrics = ['bytes', 'kilobytes', 'megabytes', 'gigabytes', 'terabytes',
        'petabytes', 'exabytes', 'zettabytes'];

    for (var i in metrics) {
        if (size < 1024) return roundToTwo(size) + ' ' + metrics[i];
        size = size / 1024;
    }
    return roundToTwo(size) + ' yottabytes';
}

function parsePayload(email, payload) {
    /* Check payload type... */
    if (payload.mimeType.indexOf('multipart') == 0) {
        var parts = payload.parts;

        /* If it is multipart, we should check type... */
        if (payload.mimeType.endsWith('alternative')) {
            /* It will have two parts: text/simple and text/html. Occasionally it contains another multipart */
            for (var i in parts) {
                if (parts[i].mimeType == 'text/html') {
                    email.html = obtainMainHTML(parts[i].body.data);
                } else if (parts[i].mimeType.indexOf('multipart') == 0) {
                    parsePayload(email, parts[i]);
                }
            }
        } else if (payload.mimeType.endsWith('mixed')) {
            /* The first parte contains more parts, the rest are attachments */
            parsePayload(email, parts[0]);

            for (var i = 1; i < parts.length; i++) {
                email.attachments.push(parts[i]);
            }

        } else if (payload.mimeType.endsWith('related')) {
            /* The first part contains more parts, the rest of the parts are files embedded in html, usually images */
            parsePayload(email, parts[0]);

            for (var i = 1; i < parts.length; i++) {
                if (parts[i].mimeType.indexOf('image') == 0) {
                    email.images.push(parts[i]);
                } else {
                    console.log("Current related multipart mime not supported yet...");
                    console.log(parts[i]);
                }
            }
        } else if (payload.mimeType.endsWith('signed')) {
            /* Signed... WTF is the difference? */
            for (var i = 0; i < parts.length; i++) {
                if (parts[i].mimeType.indexOf('application') == 0) email.attachments.push(parts[i]); //TODO bug with attachments
                else parsePayload(email, parts[i]);
            }

        } else {
            console.log("Current multipart not supported yet...");
            console.log(payload);
        }

    } else if (payload.mimeType == 'text/html') {
        /* If it is HTML, store it */
        email.html = obtainMainHTML(payload.body.data);
    } else {
        console.log("Current mimetype not supported yet...");
        console.log(payload);
    }
}

function getImageSrcToReplace(image) {
    for (var i in image.headers) if (image.headers[i].name == "Content-ID") {
        var value = image.headers[i].value;
        return "cid:" + value.substring(1, value.length - 1);
    }
    return false;
}

function roundToTwo(num) {
    return +(Math.round(num + "e+2") + "e-2");
}

function roundToPorc(num) {
    return +(Math.round(num + "e+4") + "e-2");
}

function formatMilliseconds (milli) {
    var time = [
        { m: 'minute', t: 60000},
        { m: 'hour', t: 60},
        { m: 'day', t: 24},
        { m: 'month', t: 30.4},
        { m: 'year', t: 12}
    ], m = 'a moment ago', first = true;

    for (var i in time) {
        if (milli < time[i].t) return (first) ? m : (Math.round(milli) + ' ' + ((milli >= 1.5) ? (m+'s') : m) + ' ago');
        else {
            milli /= time[i].t
            m = time[i].m;
            first = false;
        }
    }
    return (Math.round(milli) + ' ' + ((milli >= 1.5) ? (m+'s') : m) + ' ago');
}
