var app = angular.module('GmailSellsuki', ['state']);
app.controller('appController', ['$scope', 'showState', function($scope, showState){

  $scope.clientId = '331691048436-q1g7qk6qf50hvg896regfa2pdv0n1q6h.apps.googleusercontent.com';
  $scope.scopes = ['https://mail.google.com/'];
  $scope.nextPage = '';
  $scope.emails = [];
  $scope.state = showState.init();

  $scope.checkAuth = function checkAuth(immediate){
    gapi.auth.authorize({
      client_id: $scope.clientId,
      scope: $scope.scopes,
      immediate: immediate
    }, $scope.authResult);
  }

  $scope.authResult = function(res){
    $scope.$apply(function(){
      if(res && !res.error){
        showState.isLogin(true);
        $scope.createInbox();
      }else{
        showState.isLogin(false);
      }
    });
  }

  $scope.createInbox = function(){

    showState.isLoading(true);
    $scope.findMessageList( function(result){

      angular.forEach(result.messages, function(value, key){
        $scope.getMessage(value.id, $scope.findMessageDetail);
      });

      $scope.nextPage = result.nextPageToken;
      if(typeof $scope.nextPage == 'undefined'){
        $scope.$apply(function(){
          showState.canLoad(false);
        });
      }

    });
  }

  $scope.findMessageDetail = function(res){
    var tmp = {}, n = 0, header = res.payload.headers;
    for(var i=0; i < header.length ; i++){
      if(header[i].name == 'Subject'){
        tmp.Subject = header[i].value;
        n++;
      }
      if(header[i].name == 'From'){
        tmp.From = header[i].value;
        n++;
      }
      if(n==2) break;
    }

    $scope.$apply(function(){
      $scope.emails.push(tmp);
      showState.isLoading(false);
    });
  }

  $scope.findMessageList = function(callback){

    if (typeof $scope.nextPage != 'undefined'){
      gapi.client.load('gmail', 'v1').then(function(){
        var request = gapi.client.gmail.users.messages.list({
          'userId': 'me',
          'maxResults': 10,
          'pageToken' : $scope.nextPage,
          'q' : ''
        });
        request.execute(callback);
      });
    }

  }

  $scope.getMessage = function(messageId, callback) {
    gapi.client.load('gmail', 'v1').then(function(){
      var request = gapi.client.gmail.users.messages.get({
        'userId': 'me',
        'id': messageId
      });
      request.execute(callback);
    });
  }

}])
app.controller('sendEmail', ['$scope','sendState', function($scope, sendState){

  $scope.email = this.email;
  $scope.state = sendState.init();

  $scope.sendMail = function(){
    sendState.isSending(true);
    var result = gapi.client.gmail.users.getProfile({
      userId : 'me'
    });
    result.execute($scope.getProfile);
  }

  $scope.getProfile = function(res){
    $scope.email.sender = res.emailAddress;
    var emailLine = [];
    emailLine.push("From: Sellsuki <"+$scope.email.sender+">");
    emailLine.push("To: "+$scope.email.receiver);
    emailLine.push("Subject: "+$scope.email.subject);
    emailLine.push("");
    emailLine.push($scope.email.message);

    var mail = emailLine.join("\r\n").trim();
    var base64EncodedEmail = btoa(unescape(encodeURIComponent(mail))).replace(/\+/g, '-').replace(/\//g, '_');

    var requestEmail = gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw: base64EncodedEmail
      }
    });
    requestEmail.execute($scope.requestEmail);
  }

  $scope.requestEmail = function(res){
    $scope.$apply(function(){
      sendState.isSending(false);
      if(res && !res.error){
        sendState.showResult(true);
      }else{
        sendState.showResult(false);
      }
    });
  }

}]);
angular.module('state', []).factory('showState', function(){

  var state = { isLogin: false, canLoad: true, loading: [ false, 'Load More']};

  return {
    init : function(){
      return state;
    },
    isLogin : function(b){
      state.isLogin = b;
    },
    canLoad : function(b){
      state.canLoad = b;
    },
    isLoading : function(isLoading){
      state.loading[0] = isLoading;
      if(isLoading){
        state.loading[1] = 'Loading...';
      }else{
        state.loading[1] = 'Load More';
      }
    }
  }

}).factory('sendState', ['$interval', function($interval){

  var state = { result: {show : false , isComplete : true} , sending: [ false, 'Send']};

  return {
    init : function(){
      return state;
    },
    isSending : function(b){
      state.sending[0] = b;
      if(b){
        state.sending[1] = 'Sending...';
      }else{
        state.sending[1] = 'Send';
      }
    },
    showResult : function(result){
      state.result.show = true;
      state.result.isComplete = result;
      $interval(function(){
        state.result.show = false;
      }, 5400);
    }
  }

}]);
