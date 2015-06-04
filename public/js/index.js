angular.module('GmailSellsuki', []).controller('appController', function($scope){

  $scope.client_id = '331691048436-q1g7qk6qf50hvg896regfa2pdv0n1q6h.apps.googleusercontent.com';
  $scope.scopes = ['https://mail.google.com/', 'https://www.googleapis.com/auth/plus.me'];
  $scope.nextPage = '-1';
  $scope.access_token = '';

  $(window).scroll(function() {
    if($(window).scrollTop() + $(window).height() >= $(document).height() - 20) {
      $scope.makeMessage();
    }
  });

  $scope.onLoadCallback = function(){
    $('#login-btn').hide();
    $('#message').hide();
    $('.loading').hide();
    $scope.checkAuth();
  }
  $scope.checkAuth = function(){
    gapi.auth.authorize({client_id: $scope.client_id, scope: $scope.scopes, immediate: true}, $scope.result);
  }

  $scope.Auth = function() {
    gapi.auth.authorize({client_id: $scope.client_id, scope: $scope.scopes, immediate: false}, $scope.result);
  }

  $scope.result = function(res){
    if(res && !res.error){
      $('#login-btn').hide();
      $('#message').show();
      $scope.access_token = res.access_token;
      $scope.makeMessage();
    }else{
        $('#login-btn').show();
        $('#message').hide();
    }
  }

  $scope.makeMessage = function(){
    if (typeof $scope.nextPage != 'undefined'){
      $.ajax({
        type: "GET",
        url: "/inbox/" + $scope.access_token + "/" + $scope.nextPage
      }).done(function(data){
        $('.loading').show();
        data.list.forEach(function(item){
          $scope.getMessage('me', item, function(res){
            var html = '<tr><td>';
            var header = res.payload.headers;
            for(var i=0; i < header.length ; i++){
              if(header[i].name == 'Subject'){
                html += header[i].value;
                break;
              }
            }
            html += '<br>'
            html += '</td></tr>';
            $(".table").append(html);
            $('.loading').hide();
          });
        });
        $scope.nextPage = data.nextPage;
      });
    }
  }

  $scope.getMessage = function(userId, messageId, callback) {
    gapi.client.load('gmail', 'v1').then(function(){
      var request = gapi.client.gmail.users.messages.get({
        'userId': userId,
        'id': messageId
      })
      request.execute(callback)
    });
  }
});
