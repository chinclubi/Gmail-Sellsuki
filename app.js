var express = require('express');
var app = express();
var path = require('path');
var request = require('request');

var port = 8000;

var api_key = "AIzaSyDCSiUDC9ok-pD966ouSzSZVqhnSj-9Vzw";

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname+'/index.html'));
});

app.get('/inbox/:token/:n', function(req, res){
  var access_token = req.params.token;
  var _url = 'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=20&access_token='+access_token;
  var nPage = req.params.n;
  if(nPage != '-1'){
    _url += '&pageToken='+nPage;
  }
  var objMsg = {list :[], nextPage:""};
  request(_url, function(error, response, body){
    var jsonResult = JSON.parse(body);
    console.log(jsonResult);
    var msgList = jsonResult.messages;
    msgList.forEach(function(item){
      objMsg.list.push(item.threadId);
    });
    objMsg.nextPage = jsonResult.nextPageToken;
    res.json(objMsg);
  });
});

app.listen(port);
