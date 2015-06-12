var app = angular.module('GmailSellsuki', ['ui.bootstrap', 'state', 'ngSanitize']);
app.controller('appController', ['$scope', '$q', '$modal', 'stateService', 'inbox', function($scope, $q, $modal, stateService, inbox){

  $scope.clientId = '331691048436-q1g7qk6qf50hvg896regfa2pdv0n1q6h.apps.googleusercontent.com';
  $scope.scopes = ['https://mail.google.com/', 'https://www.google.com/m8/feeds'];
  $scope.nextPage = '';
  $scope.threads = inbox.threadList();
  $scope.inbox = stateService.init();

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
        stateService.isLogin(true);
        stateService.isLoading(true);
        gapi.client.load('gmail', 'v1', $scope.createInbox);
      }else{
        stateService.isLogin(false);
      }
    });
  }

  $scope.createInbox = function(){

    stateService.isLoading(true);
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
          $scope.threads.push.apply($scope.threads, res);
        }
        stateService.isLoading(false);
      });

      $scope.$apply(function(){
        $scope.nextPage = result.nextPageToken;
        if(typeof $scope.nextPage == 'undefined'){
          stateService.canLoad(false);
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
        'q' : 'label:inbox !label:updates !label:social !label:promotions !label:forums'
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

app.controller('sendEmail', ['$scope', '$modalInstance', 'stateService', 'inbox', function($scope, $modalInstance, stateService, inbox){

  $scope.email = this.email;
  $scope.state = stateService.init();

  $scope.sendMail = function(){
    stateService.isSending(true);
    var result = gapi.client.gmail.users.getProfile({
      userId : 'me'
    });
    result.execute(function(res){
      $scope.email.sender = res.emailAddress;
      var tmp = {sender: $scope.email.sender, to: $scope.email.receiver, subject: $scope.email.subject, message: $scope.email.body};
      inbox.sendMail('', tmp, $scope.sendMailResult);
    });
  }

  $scope.sendMailResult = function(result){
    $scope.$apply(function(){
      if(result && !result.error){
        stateService.alerts(true);
      }else{
        stateService.alerts(false);
      }
      stateService.isSending(false);
    });
  }

  $scope.closeModal = function(){
    $modalInstance.dismiss();
  }
}]);

app.controller('readController',['$scope', '$sce', 'stateService', 'inbox', function($scope, $sce, stateService, inbox){

  $scope.isRead = false;
  $scope.loadingMessage = false;
  $scope.currentThreadIndex = '';
  $scope.state = stateService.init();

  $scope.trustAsHtml = function(string) {
    return $sce.trustAsHtml(string);
  };

  $scope.loadThreadDetail = function(index){
    var currentThread = inbox.threadList()[index];
    $scope.currentThreadIndex = index;
    $scope.isRead = true;
    $scope.loadingMessage = true;
    if(typeof currentThread.messages[0].body == 'undefined'){
      $scope.getFullThreads(currentThread.id, function(result){
        angular.forEach(currentThread.messages, function(message, key){
          var payload = result.messages[key].payload;
          var body = '';
          if(typeof payload.body.data != 'undefined'){
            body = payload.body.data;
          }else{
            if(typeof payload.parts[0] != 'undefined'){
              if(typeof payload.parts[0].body.data != 'undefined')
                body = payload.parts[0].body.data;
            }
            if(typeof payload.parts[1] != 'undefined'){
              if(typeof payload.parts[1].body.data != 'undefined')
                body = payload.parts[1].body.data;
            }
          }
          body = body.replace(/\-/g, '+').replace(/\_/g, '/');
          message.body = decodeURIComponent(escape(atob(body))).replace(/\n/g,'<br>');
        });
        $scope.$apply(function(){
          $scope.loadingMessage = false;
        });
      });
    }else{
      $scope.loadingMessage = false;
    }
  }

  $scope.getBack = function(){
    $scope.isRead = false;
  }

  $scope.getThread = function(){
    return inbox.threadList()[$scope.currentThreadIndex];
  }

  $scope.reply = function(){
    stateService.isSending(true);
    var currentThread = $scope.getThread();
    var tmp = {};
    var threadId = currentThread.id;
    tmp.subject = currentThread.messages[0].payload.headers.Subject;
    var result = gapi.client.gmail.users.getProfile({
      userId : 'me'
    });
    result.execute(function(res){
      tmp.sender = res.emailAddress;
      tmp.to = currentThread.messages[0].payload.headers.To.email[0];
      if(tmp.to == tmp.sender){
        tmp.to = currentThread.messages[0].payload.headers.From.email[0];
      }
      tmp.message = $scope.replyMsg;
      inbox.sendMail(threadId, tmp, $scope.sendMailResult);
    });
  }

  $scope.sendMailResult = function(result){
    $scope.$apply(function(){
      if(result && !result.error){
        stateService.alerts(true);
        $scope.replyMsg = '';
      }else{
        stateService.alerts(false);
        $scope.replyMsg = '';
      }
      stateService.isSending(false);
    });
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

angular.module('state', []).factory('stateService', ['$interval', function($interval){

  var state = { isLogin: false, canLoad: true, loading: [ false, 'Load More'], alerts : [], result: {show : false , isComplete : true} , sending: [ false, 'Send']};

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

}]).factory('inbox',  function(){

  var emailList = [];

  return{
    threadList : function(){
      return emailList;
    },
    sendMail : function(threadId, messageDetail, callback){
      var emailLine = [];
      emailLine.push("From: Sellsuki <"+messageDetail.sender+">");
      emailLine.push("To: "+messageDetail.to);
      emailLine.push("Subject: "+messageDetail.subject);
      emailLine.push("");
      emailLine.push(messageDetail.message);

      var mail = emailLine.join("\r\n").trim();
      var base64EncodedEmail = btoa(unescape(encodeURIComponent(mail))).replace(/\+/g, '-').replace(/\//g, '_');

      var requestEmail = gapi.client.gmail.users.messages.send({
        userId: 'me',
        resource: {
          raw: base64EncodedEmail,
          threadId: threadId
        }
      });
      requestEmail.execute(callback);
    }
  }

});
