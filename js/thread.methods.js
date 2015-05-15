/**
 * Created by Andrés on 07/04/2015.
 */
"use strict";

function setThreadMetadata(thread, result) {
    var firstMessage = result.messages[0];
    var lastMessage = result.messages[result.messages.length - 1];
    var dateLabels = getThreadDateLabels(result);

    thread.subject = getMessageSubject(firstMessage);
    thread.snippet = getMessageSnippet(lastMessage);
    thread.sender = getMessageSender(lastMessage);
    thread.labels = dateLabels[0];
    thread.date = dateLabels[1];
    thread.dateSent = dateLabels[2];

    thread.numOfMsgs = result.messages.length
    thread.messages = [];
}

function updateThreadMetadata(thread, message) {
    if (!thread.subject) thread.subject = getMessageSubject(message);

    thread.snippet = getMessageSnippet(message);
    thread.sender = getMessageSender(message);

    if (!thread.labels) thread.labels = message.labelIds;
    else {
        for (var i in message.labelIds) {
            var label = message.labelIds[i];
            if (thread.labels.indexOf(label) == -1) thread.labels.push(label);

            if (!label.indexOf('SENT')) thread.dateSent = new Date(getMessageDate(message));
            else thread.date = new Date(getMessageDate(message));
        }
    }

    if (!thread.numOfMsgs) { thread.numOfMsgs = 1; thread.messages = []; }
    else thread.numOfMsgs += 1;
}

function getMessageSubject(message) {
    var headers = message.payload.headers;
    for (var i in headers) if (headers[i].name.toLowerCase() == "subject") return headers[i].value;
    return "(No subject)";
}

function getMessageSnippet(message) {
    var snippet = message.snippet;
    return (snippet) ? htmlspecialchars_decode(snippet, 1) : false;
}

function getMessageDate(message) {
    var headers = message.payload.headers;
    for (var i in headers) if (headers[i].name.toLowerCase() == "date") return formatDate(headers[i].value);
    return "(No date)";
}

function getMessageSender(message) {
    var headers = message.payload.headers;
    for (var i in headers) if (headers[i].name.toLowerCase() == "from") return formatSender(headers[i].value);
    return "(No sender)";
}

function getThreadLabels(response) {
    var label, labels = [];
    for (var i in response.messages) {
        for (var n in response.messages[i].labelIds) {
            label = response.messages[i].labelIds[n];
            if (labels.indexOf(label) == -1) labels.push(label);
        }
    }
    return labels;
}

function getThreadDateLabels(response) {
    var dateSent, date, label, labels = [];
    for (var i in response.messages) {
        for (var n in response.messages[i].labelIds) {
            label = response.messages[i].labelIds[n];
            if (labels.indexOf(label) == -1) labels.push(label);
        }

        if (!response.messages[i].labelIds.indexOf('SENT')) {
            dateSent = new Date(getMessageDate(response.messages[i]));
            if (response.messages[i].labelIds.length > 1) date = new Date(getMessageDate(response.messages[i]));
        } else date = new Date(getMessageDate(response.messages[i]));

    }
    return [labels, date, dateSent];
}

function formatSender(sender) {
    var value = sender.replace(new RegExp('"', "g"), '');

    var x = value.indexOf('<');
    if (x > 0) return value.substring(0, x - 1);
    else {
        var y = value.indexOf('@');
        return (x == 0) ? value.substring(1, y) : value.substring(0, y);
    }
}

function formatDate(date) {
    //Comprobar si tienen la franja horaria definida
    var standardMatch = date.match(/[+-]\d\d\d\d/);
    if (standardMatch) return date;

    //Si no la tienen, buscar si existe algún standard horario
    var standard = { "CEST": "+0200", "LINT": "+1400", "TOT": "+1300", "CHAST": "+1245", "NZST": "+1200", "NFT": "+1130",
        "SBT": "+1100", "AEST": "+1000", "ACST": "+0930", "JST": "+0900", "CWST": "+0845", "CT": "+0800", "ICT": "+0700",
        "MMT": "+0630", "BST": "+0600", "NPT": "+0545", "IST": "+0530", "PKT": "+0500", "AFT": "+0430", "MSK": "+0400",
        "IRST": "+0330", "FET": "+0300", "EET": "+0200", "CET": "+0100", "GMT": "+0000", "UTC": "+0000", "CVT": "-0100",
        "GST": "-0200", "BRT": "-0300", "NST": "-0330", "AST": "-0400", "EST": "-0500", "CST": "-0600", "MST": "-0700",
        "PST": "-0800", "AKST": "-0900", "MIT": "-0930", "HST": "-1000", "SST": "-1100", "BIT": "-1200" };
    var match = date.match(/(\d?\d:\d?\d:\d?\d)/), index, indexTime = (match) ? date.indexOf(match[0]) + match[0].length : -1;

    if (indexTime != -1) for (var key in standard) {
        index = date.indexOf(key, indexTime);
        if (index != -1) return date.substring(0, index) + standard[key] + '(' + key + ')' + date.substring(index + key.length);
    }

    return date;
}

function isAttachment(thread) {
    return (thread.labels.length == 1 && (thread.subject.indexOf('Archivo adjunto') || thread.subject.indexOf('Attachment')));
}

function htmlspecialchars_decode(string, quote_style) {
    // discuss at: http://phpjs.org/functions/htmlspecialchars_decode/
    var optTemp = 0, i = 0, noquotes = false;
    if (typeof quote_style === undefined) quote_style = 2;

    string = string.toString().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

    var OPTS = { 'ENT_NOQUOTES': 0, 'ENT_HTML_QUOTE_SINGLE': 1, 'ENT_HTML_QUOTE_DOUBLE': 2,  'ENT_COMPAT': 2, 'ENT_QUOTES': 3, 'ENT_IGNORE': 4 };
    if (quote_style === 0) noquotes = true;

    if (typeof quote_style !== 'number') {
        // Allow for a single string or an array of string flags
        quote_style = [].concat(quote_style);

        // Resolve string input to bitwise e.g. 'PATHINFO_EXTENSION' becomes 4
        for (i = 0; i < quote_style.length; i++)
            if (OPTS[quote_style[i]] === 0) noquotes = true;
            else if (OPTS[quote_style[i]]) optTemp = optTemp | OPTS[quote_style[i]];
        quote_style = optTemp;
    }

    if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
        string = string.replace(/&#0*39;/g, "'"); // PHP doesn't currently escape if more than one 0, but it should
        string = string.replace(/&apos;|&#x0*27;/g, "'"); // This would also be useful here, but not a part of PHP
    }

    if (!noquotes) string = string.replace(/&quot;/g, '"');

    // Put this in last place to avoid escape being double-decoded
    return string.replace(/&amp;/g, '&');
}

function utf8_encode(argString) {
    //discuss at: http://phpjs.org/functions/utf8_encode/
    if (argString === null || typeof argString === 'undefined') return '';

    // .replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var string = (argString + '');
    var utftext = '', start, end, stringl = 0;

    start = end = 0;
    stringl = string.length;
    for (var n = 0; n < stringl; n++) {
        var c1 = string.charCodeAt(n);
        var enc = null;

        if (c1 < 128) end++;
        else if (c1 > 127 && c1 < 2048) enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128);
        else if ((c1 & 0xF800) != 0xD800) enc = String.fromCharCode((c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128);
        else {
            // surrogate pairs
            if ((c1 & 0xFC00) != 0xD800) throw new RangeError('Unmatched trail surrogate at ' + n);

            var c2 = string.charCodeAt(++n);
            if ((c2 & 0xFC00) != 0xDC00) throw new RangeError('Unmatched lead surrogate at ' + (n - 1));

            c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000;
            enc = String.fromCharCode((c1 >> 18) | 240, ((c1 >> 12) & 63) | 128, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128);
        }
        if (enc !== null) {
            if (end > start) utftext += string.slice(start, end);

            utftext += enc;
            start = end = n + 1;
        }
    }

    if (end > start) utftext += string.slice(start, stringl);
    return utftext;
}