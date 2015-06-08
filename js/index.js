var app = angular.module('GmailSellsuki', ['ui.bootstrap', 'state', 'ngSanitize']);
app.controller('appController', ['$scope', '$modal', 'showState', function($scope, $modal, showState){

  $scope.clientId = '331691048436-q1g7qk6qf50hvg896regfa2pdv0n1q6h.apps.googleusercontent.com';
  $scope.scopes = ['https://mail.google.com/', 'https://www.google.com/m8/feeds'];
  $scope.nextPage = '';
  $scope.threads = [];
  $scope.inbox = showState.init();

  $scope.css = {readStyle: '', addRow: ''}

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

      angular.forEach(result.threads, function(value, key){
        $scope.getThreads(value.id, $scope.findThreadsDetail);

        if( key == result.threads.length - 1){
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

  $scope.findThreadsDetail = function(res){
    $scope.$apply(function(){
      angular.forEach(res.messages, function(value, key){
        value.payload.headers.sort(function(a, b){
          return a.name > b.name ? 1 : (a.name < b.name ? -1 : 0);
        });
      });
      $scope.threads.push(res);
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
    return tmp;
  }

  $scope.findThreadList = function(callback){
    if (typeof $scope.nextPage != 'undefined'){
      var request = gapi.client.gmail.users.threads.list({
        'userId': 'me',
        'maxResults': 10,
        'pageToken' : $scope.nextPage,
        'q' : '',
        'fields' : 'nextPageToken,threads/id'
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

  $scope.detail = function(n){
    if($scope.css.readStyle != ''){
      $scope.css.readStyle = '';
      $scope.css.addRow = '';
    }else{
      $scope.css.readStyle = 'slide col-md-6';
      $scope.css.addRow = 'row';
    }

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
