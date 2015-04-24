/**
 * Created by Andrés on 07/04/2015.
 */
function setThreadMetadata(thread, result) {
    thread.subject = getThreadSubject(result);
    thread.snippet = getThreadSnippet(result);
    thread.unread = isThreadUnread(result);
    thread.date = Date.parse(getThreadDate(result));
    thread.sender = getSenderThread(result);
    thread.numOfMsgs = getNumOfMessages(result);
    thread.labels = getLabels(result);
    thread.messages = [];
}

function getThreadSubject(response) {
    var headers = response.messages[0].payload.headers;
    for (i in headers) if (headers[i].name == "Subject") return headers[i].value;
    return "(No subject)";
}

function getThreadSnippet(response) {
    var snippet = response.messages[response.messages.length - 1].snippet;
    return (snippet) ? htmlspecialchars_decode(snippet, 1): "(No snippet)";
}

function getThreadDate(response) {
    var headers = response.messages[response.messages.length - 1].payload.headers;
    for (i in headers) if (headers[i].name == "Date") return formatDate(headers[i].value);
    return "(No date)";
}

function isThreadUnread(response) {
    var labelIds = response.messages[response.messages.length - 1].labelIds;
    for (i in labelIds) if (labelIds[i] == "UNREAD") return true;
    return false;
}

function getSenderThread(response) {
    var headers = response.messages[response.messages.length - 1].payload.headers;
    for (i in headers) if (headers[i].name == "From") return formatSender(headers[i].value);
    return "(No sender)";
}

function getLabels(response) {
    var message, label, labels = [];
    for (i in response.messages) {
        message = response.messages[i];

        for (n in message.labelIds) {
            label = message.labelIds[n];

            if (labels.indexOf(label) == -1) labels.push(label);
        }
    }
    return labels;
}

function getNumOfMessages(response) {
    return (response.messages.length > 1) ? '(' + response.messages.length + ')' : '';
}

function formatSender(sender) {
    var value = sender.replace(new RegExp('"', "g"), '');

    var x = value.indexOf('<');
    if (x > 0) {
        return value.substring(0, x - 1);
    } else {
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
        "PST": "-0800", "AKST": "-0900", "MIT": "-0930", "HST": "-1000", "SST": "-1100", "BIT": "-1200"
    };
    var match = date.match(/(\d?\d:\d?\d:\d?\d)/), index, indexTime = (match) ? date.indexOf(match[0]) + match[0].length : -1;

    if (indexTime != -1) for (var key in standard) {
        index = date.indexOf(key, indexTime);
        if (index != -1) {
            return date.substring(0, index) + standard[key] + '(' + key + ')' + date.substring(index + key.length);
        }
    }

    return date;
}

function htmlspecialchars_decode(string, quote_style) {
    //       discuss at: http://phpjs.org/functions/htmlspecialchars_decode/
    //      original by: Mirek Slugen
    //      improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    //      bugfixed by: Mateusz "loonquawl" Zalega
    //      bugfixed by: Onno Marsman
    //      bugfixed by: Brett Zamir (http://brett-zamir.me)
    //         input by: ReverseSyntax
    //         input by: Slawomir Kaniecki
    //         input by: Scott Cariss
    //         input by: Francois
    //         input by: Ratheous
    //         input by: Mailfaker (http://www.weedem.fr/)
    //       revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // reimplemented by: Brett Zamir (http://brett-zamir.me)
    //        example 1: htmlspecialchars_decode("<p>this -&gt; &quot;</p>", 'ENT_NOQUOTES');
    //        returns 1: '<p>this -> &quot;</p>'
    //        example 2: htmlspecialchars_decode("&amp;quot;");
    //        returns 2: '&quot;'

    var optTemp = 0, i = 0, noquotes = false;
    if (typeof quote_style === undefined) quote_style = 2;

    string = string.toString().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

    var OPTS = {
        'ENT_NOQUOTES': 0,
        'ENT_HTML_QUOTE_SINGLE': 1,
        'ENT_HTML_QUOTE_DOUBLE': 2,
        'ENT_COMPAT': 2,
        'ENT_QUOTES': 3,
        'ENT_IGNORE': 4
    };
    if (quote_style === 0) {
        noquotes = true;
    }

    if (typeof quote_style !== 'number') {
        // Allow for a single string or an array of string flags
        quote_style = [].concat(quote_style);

        for (i = 0; i < quote_style.length; i++) {
            // Resolve string input to bitwise e.g. 'PATHINFO_EXTENSION' becomes 4
            if (OPTS[quote_style[i]] === 0) {
                noquotes = true;
            } else if (OPTS[quote_style[i]]) {
                optTemp = optTemp | OPTS[quote_style[i]];
            }
        }
        quote_style = optTemp;
    }

    if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
        string = string.replace(/&#0*39;/g, "'"); // PHP doesn't currently escape if more than one 0, but it should
        string = string.replace(/&apos;|&#x0*27;/g, "'"); // This would also be useful here, but not a part of PHP
    }

    if (!noquotes) {
        string = string.replace(/&quot;/g, '"');
    }

    // Put this in last place to avoid escape being double-decoded
    string = string.replace(/&amp;/g, '&');

    return string;
}