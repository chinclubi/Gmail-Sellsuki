angular.module('GmailSellsuki', []).controller('appController', ['$scope', function($scope){

  $scope.client_id = '331691048436-q1g7qk6qf50hvg896regfa2pdv0n1q6h.apps.googleusercontent.com';
  $scope.scopes = ['https://mail.google.com/', 'https://www.googleapis.com/auth/plus.me'];
  $scope.nextPage = '';
  $scope.access_token = '';
  $scope.emails = [];
  $scope.state = {loginBtn:0, message:0, loadMore: 0};

  $scope.checkAuth = function checkAuth(immediate){
    gapi.auth.authorize({client_id: $scope.client_id, scope: $scope.scopes, immediate: immediate}, $scope.result);
  }

  $scope.result = function result(res){
    if(res && !res.error){
      $scope.access_token = res.access_token;
      $scope.makeMessage();
      $scope.state.message = 1;
      $scope.state.loginBtn = 0;
      $scope.state.loadMore = 1;
    }else{
      $scope.state.message = 0;
      $scope.state.loginBtn = 1;
      $scope.state.loadMore = 0;
    }
    $scope.$apply();
  }

  $scope.makeMessage = function makeMessage(){
    $("#loadBtn").button('loading');
    $scope.getMessageList(function(result){
      result.messages.forEach(function(item){
        $scope.getMessage(item.threadId, function(res){
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
          $scope.emails.push(tmp);
          $scope.$apply();
          $('#loadBtn').button('reset');
        });
      });
    });
  }

  $scope.getMessage = function getMessage(messageId, callback) {
    gapi.client.load('gmail', 'v1').then(function(){
      var request = gapi.client.gmail.users.messages.get({
        'userId': 'me',
        'id': messageId
      });
      request.execute(callback);
    });
  }

  $scope.getMessageList = function getMessageList(callback){
    if (typeof $scope.nextPage != 'undefined'){
      gapi.client.load('gmail', 'v1').then(function(){
        var request = gapi.client.gmail.users.messages.list({
          'userId': 'me',
          'maxResults': 10,
          'pageToken' : $scope.nextPage,
          'q' : 'from:(j.brucker@ku.th)'
        });
        request.execute(callback);
      });
    }else{
      $scope.state.loadMore = 0;
      $scope.$apply();
    }
  }
}]);
