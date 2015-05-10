# BlackMail
Javascript Gmail client made with Google API for my final project.

# Installation
Clone this repository on your computer:
```
git clone https://github.com/Brugarolas/BlackMail.git
cd BlackMail
```

Create a localhost on port 3000 to serve static files. In Node.js with Express:
```
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
```

Open your browser and enter [http://localhost:3000](http://localhost:3000).
