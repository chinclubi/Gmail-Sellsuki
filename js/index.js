var app = angular.module('GmailSellsuki', ['ui.bootstrap', 'state', 'ngSanitize']);
app.controller('appController', ['$scope', '$q', '$modal', 'showState', function($scope, $q, $modal, showState){

  $scope.clientId = '331691048436-q1g7qk6qf50hvg896regfa2pdv0n1q6h.apps.googleusercontent.com';
  $scope.scopes = ['https://mail.google.com/', 'https://www.google.com/m8/feeds'];
  $scope.nextPage = '';
  $scope.inboxData = [];
  $scope.inbox = showState.init();

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
        showState.isLoading(true);
        gapi.client.load('gmail', 'v1', $scope.createInbox);
      }else{
        showState.isLogin(false);
      }
    });
  }

  $scope.createInbox = function(){

    showState.isLoading(true);
    $scope.findThreadList( function(result){

      var p = [];

      angular.forEach(result.threads, function(value, key){
        var defferred = $q.defer();
        $scope.getThreads(value.id, function(res){
          angular.forEach(res.messages, function(value, key){
            $scope.payloadFac(value);
          });
          defferred.resolve(res);
        });
        p.push(defferred.promise);
      });

      $q.all(p).then(function(res){
        if(res && !res.error){
          $scope.inboxData.push.apply($scope.inboxData, res);
          showState.isLoading(false);
        }
      });

      $scope.$apply(function(){
        $scope.nextPage = result.nextPageToken;
        if(typeof $scope.nextPage == 'undefined'){
          showState.canLoad(false);
        }
      });
    });
  }

  $scope.payloadFac = function(msg){
    var tmp = {}, n = 0, header = msg.payload.headers;
    for(var i=0; i < header.length ; i++){
      if(header[i].name == 'Subject'){
        tmp.Subject = header[i].value;
      }
      if(header[i].name == 'From'){
        tmp.From = {};
        tmp.From.name = header[i].value.match(/^.*(?=<)/g);
        tmp.From.email = header[i].value.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g);
      }
      if(header[i].name == 'To'){
        tmp.To = {};
        tmp.To.name = header[i].value.match(/^.*(?=<)/g);
        tmp.To.email = header[i].value.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g);
      }
      if(header[i].name == 'Date'){
        tmp.Date = new Date(header[i].value);
      }
    }
    msg.payload.headers = tmp;
  }

  $scope.findThreadList = function(callback){
    if (typeof $scope.nextPage != 'undefined'){
      var request = gapi.client.gmail.users.threads.list({
        'userId': 'me',
        'maxResults': 10,
        'pageToken' : $scope.nextPage,
        'q' : ''
      });
      request.execute(callback);
    }
  }

  $scope.getThreads = function(threadId, callback) {
    var request = gapi.client.gmail.users.threads.get({
      'userId': 'me',
      'id': threadId,
      'format': 'metadata',
      'metadataHeaders': ['From', 'To', 'Subject', 'Date']
    });
    request.execute(callback);
  }

  $scope.sendMailModal = function(){
    var modalInstance = $modal.open({
      animation: true,
      templateUrl: 'template/template-send-mail.html',
      controller: 'sendEmail',
      size: ''
    });
  }
}]);

app.controller('sendEmail', ['$scope', '$modalInstance', 'sendState', function($scope, $modalInstance, sendState){

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
      if(res && !res.error){
        sendState.alerts(true);
      }else{
        sendState.alerts(false);
      }
      sendState.isSending(false);
    });
  }

  $scope.closeModal = function(){
    $modalInstance.dismiss();
  }
}]);

app.controller('readController',['$scope', '$sce', function($scope, $sce){

  $scope.isRead = false;
  $scope.fullThread = [];
  $scope.loadingMessage = false;
  $scope.htmlBody = '';

  $scope.trustAsHtml = function(string) {
    return $sce.trustAsHtml(string);
  };

  $scope.detail = function(thread){
    $scope.isRead = true;
    $scope.loadingMessage = true;
    if(typeof $scope.fullThread[thread.id] == 'undefined'){
      $scope.getFullThreads(thread.id, function(result){
        // console.log(result);
        angular.forEach(thread.messages, function(message, key){
          var payload = result.messages[key].payload;
          message.payload.body = payload.body.data;
          message.payload.mimeType = payload.mimeType;
          message.payload.parts = [];
          angular.forEach(payload.parts, function(item, _key){
            message.payload.parts[_key] = {};
            message.payload.parts[_key].body = payload.parts[_key].body.data;
            message.payload.parts[_key].mimeType = payload.parts[_key].mimeType;
          });
        });
        //Test Decode base64
        var msg64 = [];
        angular.forEach(thread.messages, function(message, n){
          var tmp = {};
          if(typeof message.payload.body != 'undefined'){
            tmp.body = decodeURIComponent(escape(atob(message.payload.body)));
            // msg64.push(atob(message.payload.body));
          }else{
            tmp.body = decodeURIComponent(escape(atob(message.payload.parts[1].body.replace(/\-/g, '+').replace(/\_/g, '/'))));
            // msg64.push(atob(message.payload.parts[1].body.replace(/\-/g, '+').replace(/\_/g, '/')));
          }
          tmp.payload = message.payload.headers;
          msg64.push(tmp);
        });
        // var msg64 = (thread.messages[0].payload.parts[1].body).replace(/\-/g, '+').replace(/\_/g, '/');

        $scope.fullThread[thread.id] = thread;
        $scope.$apply(function(){
          $scope.htmlBody = msg64;
          // console.log($scope.htmlBody);
          $scope.loadingMessage = false;
        });
        // End Test
      });
    }else{
      // console.log($scope.fullThread[thread.id]);
      var message = $scope.fullThread[thread.id].messages;
      var msg64 = [];
      angular.forEach(thread.messages, function(message, n){
        var tmp = {};
        if(typeof message.payload.body != 'undefined'){
          tmp.body = decodeURIComponent(escape(atob(message.payload.body)));
          // msg64.push(atob(message.payload.body));
        }else{
          tmp.body = decodeURIComponent(escape(atob(message.payload.parts[1].body.replace(/\-/g, '+').replace(/\_/g, '/'))));
        }
        console.log(tmp.body);
        tmp.payload = message.payload.headers;
        msg64.push(tmp);
      });
      $scope.htmlBody = msg64;
      $scope.loadingMessage = false;
    }
  }

  $scope.getBack = function(){
    $scope.isRead = false;
  }

  $scope.getFullThreads = function(threadId, callback) {
    var request = gapi.client.gmail.users.threads.get({
      'userId': 'me',
      'id': threadId,
      'format': 'full',
      'fields' : 'messages(id,payload,raw)'
    });
    request.execute(callback);
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

  var state = { alerts : [], result: {show : false , isComplete : true} , sending: [ false, 'Send']};

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
    alerts : function(result){
      if(result){
        state.alerts.push({ type: 'success', msg: '<b>Successful!</b> Your message was sent successfully.'});
      }else{
        state.alerts.push({ type: 'danger', msg: '<b>Oh no!</b> Something worng while sending your email.'});
      }
      $interval(function(){
        state.alerts.splice(0, 1);
      }, 5400);
    }
  }

}]);
