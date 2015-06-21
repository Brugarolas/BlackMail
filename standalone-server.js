console.log("Loading server...");
var express = require('express');
var app = express();
var http = require('http').Server(app);

var port = process.env.PORT || 3000;

app.all('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.use(express.static(__dirname + '/BlackMail'));

http.listen(port, function() {
  console.log('Listening on port ' + port);
});
