/**
 * Created by Usuario on 04/05/2015.
 */
"use strict";

function setIframeData(iframe, content, margin) {
    iframe.contentWindow.document.open('text/html', 'replace');
    iframe.contentWindow.document.write(content);
    iframe.contentWindow.document.close();

    iframe.onload = function () {
        iframe.height = iframe.contentWindow.document.body.scrollHeight + ((!margin) ? 0 : margin );
    }
}