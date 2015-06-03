var app = require('express')();
var path = require('path');
var request = require('request');

var port = 8000;

var api_key = "AIzaSyDCSiUDC9ok-pD966ouSzSZVqhnSj-9Vzw";

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname+'/index.html'));
});

app.get('/inbox/:token/', function(req, res){
  var access_token = req.params.token;
  var _url = 'https://www.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=10&q=category%3Aprimary&access_token='+access_token;
  var objMsg = [];
  request(_url, function(error, response, body){
    var jsonResult = JSON.parse(body);
    var msgList = jsonResult.messages;
    msgList.forEach(function(item){
      objMsg.push(item.threadId);
    });
    res.json(objMsg);
  });
});

app.listen(port);
