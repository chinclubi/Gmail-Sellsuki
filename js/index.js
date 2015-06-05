angular.module('GmailSellsuki', []).controller('appController', ['$scope', 'showState', function($scope, showState){

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
    if(res && !res.error){
      $scope.$apply(function(){
        $scope.state = showState.normalState();
        $scope.createInbox();
      });
    }else{
      $scope.$apply(function(){
        $scope.state = showState.loginState();
      });
    }
  }

  $scope.createInbox = function(){
    $scope.state = showState.loadState();
    $scope.findMessageList( function(result){

      angular.forEach(result.messages, function(value, key){
        $scope.getMessage(value.threadId, $scope.findMessageDetail);
      });

      $scope.nextPage = result.nextPageToken;

      if(typeof $scope.nextPage == 'undefined'){
        $scope.$apply(function(){
          $scope.state = showState.noEnoughState();
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
      $scope.state = showState.normalState();
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

}]).factory('showState', function(){
  var init = function(){
    return { loginBtn: 0, message: 0, loadMore: 0, loading: [0, 'Load More'] };
  }
  var loginState = function(){
    return { loginBtn: 1, message: 0, loadMore: 0, loading: [0, 'Load More'] };
  }
  var normalState = function(){
    return { loginBtn: 0, message: 1, loadMore: 1, loading: [0, 'Load More'] };
  }
  var noEnoughState = function(){
    return { loginBtn: 0, message: 1, loadMore: 0, loading: [0, 'Load More'] };
  }
  var loadState = function(){
    return { loginBtn: 0, message: 1, loadMore: 1, loading: [1, 'Loading..'] };
  }

  return {
    init : init,
    loginState : loginState,
    normalState : normalState,
    noEnoughState : noEnoughState,
    loadState : loadState
  }

});
