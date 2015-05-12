/**
 * Created by Andrés on 06/04/2015.
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
    getLink(text);
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

function getLink(find) {
    /*console.log(find);

     if (find.indexOf('http') == 0) return "<a href=" + find + ">" + find + "</a>";
     if (find.indexOf('www') != 0 && find.indexOf('@') > -1) return "<a href=mailto:" + find + ">" + find + "</a>";
     return "<a href=http://" + find + ">" + find + "</a>";*/
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
    //Comprobar el tipo de payload
    if (payload.mimeType.indexOf('multipart') == 0) {
        var parts = payload.parts;

        // Si es multiparte, debemos comprobar qué tipo de multiparte es..
        if (payload.mimeType.endsWith('alternative')) {
            //Dos partes: Una texto simple y otra texto html
            for (var i in parts) {
                if (parts[i].mimeType == 'text/html') {
                    email.html = obtainMainHTML(parts[i].body.data);
                } else if (parts[i].mimeType.indexOf('multipart') == 0) {
                    parsePayload(email, parts[i]);
                }
            }
        } else if (payload.mimeType.endsWith('mixed')) {
            //La primera parte contiene más partes, el resto de elementos son adjuntos
            parsePayload(email, parts[0]);

            for (var i = 1; i < parts.length; i++) {
                if (parts[i].mimeType.indexOf('application') == 0 || parts[i].mimeType.indexOf('text') == 0) {
                    email.attachments.push(parts[i]);
                } else {
                    console.log("Current mixed multipart mime not supported yet...");
                    console.log(parts[i]);
                }
            }

        } else if (payload.mimeType.endsWith('related')) {
            //La primera parte contiene más partes, el resto de elementos son imágenes
            parsePayload(email, parts[0]);

            for (var i = 1; i < parts.length; i++) {
                if (parts[i].mimeType.indexOf('image') == 0) {
                    email.images.push(parts[i]);
                } else {
                    console.log("Current related multipart mime not supported yet...");
                    console.log(parts[i]);
                }
            }
        } else {
            console.log("Current multipart not supported yet...");
            console.log(payload);
        }

    } else if (payload.mimeType == 'text/html') {
        //Si es HTML, lo guardamos
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

