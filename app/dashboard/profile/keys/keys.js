function success(message){
    alert(message)
  }
  
  
  function error(message){
    alert(message)
  }
  
function encryptKeys(key,seed){
  var ciphertext = CryptoJS.AES.encrypt(key,seed);
  return ciphertext
}

 function translate(phrase){
    var chars={
		"á":"a", "é":"e", "í":"i", "ó":"o", "ú":"u","ñ":"n"}
    var expr=/[áàéèíìóòúù]/ig;
    var text= phrase.replace(expr,function(e){return chars[e]});
    return text;

 }

  angular.module('sharekey.keys', ['ui.router'])
  
  .config(['$stateProvider', function($stateProvider) {
    $stateProvider.state('dash.keys', {
      url: '/keys',
      templateUrl: '../dashboard/profile/keys/keys.html',
      controller: 'keysController',
      css: 'keys.css'
    })
  }])
  
  .controller('keysController', function($scope,$http,$localStorage,$state,$window){
    var uid = $localStorage.uid;
    $scope.key = $localStorage[uid + '-pubkey'];
    $scope.keyname = $localStorage[uid + '-keyname'];
    $scope.userKeys = $localStorage[uid + 'keys']

    $scope.toggleShowPassword = function() {
      $scope.showPassword = !$scope.showPassword;
    }

    $scope.generarPalabras = function (){
      $http({
        url: 'https://sharekey.herokuapp.com/mnemonic',
        method: 'GET',
      }).then(function (response){
        if (response.data.status == 200){
            $scope.words = response.data.message;
        }else{
          error(response.data.message);
        }  
      })
          
    }

    $scope.checkKeys = function(){
      $http({
        url: 'https://sharekey.herokuapp.com/profile/' + uid + '/getKeys',
        method: 'GET'
      }).then(function (response){
            $scope.keys = response.data.data;
      }).catch(function (error){
          if (e.status == 401){
            error('Su sesion ha vencido por inactividad')
            $location.path('/login');
          }else{
            console.log(error.data);
          }
        })
          
    }

    $scope.useKeys = function (name,public,private,pass){
      
        var newkey = {
          name: name,
          public: public,
          private: private,
          pass: pass
        }
        $localStorage.todelete = newkey
        
    }

    $scope.checkWords = function (){
      if ($scope.password){
        words = translate($scope.password);
        pass = $localStorage.todelete.pass;
        var bytes  = CryptoJS.AES.decrypt(pass, words);
        var plaintext = bytes.toString(CryptoJS.enc.Utf8);
        if (plaintext != ""){
          $localStorage[uid + '-pubkey'] = $localStorage.todelete.public;
          $localStorage[uid + '-privateKey'] = $localStorage.todelete.private;
          $localStorage[uid + '-pass'] = $localStorage.todelete.pass;
          $localStorage[uid + '-keyname'] = $localStorage.todelete.name;
          var popup = angular.element("#changeKey");
          //for hide model
          popup.modal('hide');
          delete $localStorage.todelete
          $state.reload();
        }else{
          alert('La frase no coincide con la llave')
        }
      }else{
        alert('Por favor llene el campo')
      }  
      
    }

    $scope.close = function (){
      var popup = angular.element("#changeKey");
      //for hide model
      popup.modal('hide');
      delete $localStorage.todelete
    }

    storekeys = function (public,private,pass,name){
        
        var storeRequest = $.param({
          pubkey: public,
          privkey: private,
          pass: pass,
          keyname: name,
          default: false
        })
          
        $http({
          url: 'https://sharekey.herokuapp.com/profile/' + $localStorage.uid + '/storeKeys',
          method: 'POST',
          data: storeRequest,
          headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
        }).then(function (response){
            if (response.data.status == 200){
                console.log('keys stored succesfully')
                $window.location.reload();
            }else{
              error(response.data.message);
            }
        }).catch(function (e){
          if (e.status == 401){
              error('Su sesion ha vencido por inactividad')
              $location.path('/login');
            }
          })
    }

    var localStorekeys = function(public,private,pass,name){
      var newKey = {
        keyname: name,
        publicKey: public,
        privateKey: private,
        passphrase: pass,
        default: false
      }

      $scope.userKeys = $scope.userKeys.push(newKey);
      $localStorage[uid + 'keys'] = $scope.userKeys;
    }

    checkParameters = function (){
        if (($scope.keyname == "")  && ($scope.name == "") && ($scope.email == "") && ($scope.passphrase = "") && ($scope.phrase == "")){
          return false;
        }else{
          return true;
        }
    }



    $scope.generateKeys =  function (){
          if (checkParameters){
            var uid = $localStorage.uid;
            var options = {
                userIds: [{ name: $scope.name, email: $scope.email}],
                numBits: 4096,
                passphrase: $scope.passphrase,
            }
            words = translate($scope.phrase);
            password = translate($scope.password);
            console.log("Generating Keys")
            openpgp.generateKey(options).then(function(key){
                var privkey = key.privateKeyArmored;
                var pubkey = key.publicKeyArmored;
                console.log('keys created')
                console.log('keys encrypted');
                // encrypt keys on local storage
                var localPrivateKey = encryptKeys(privkey,password)
                var localPass = encryptKeys($scope.passphrase,password)
                localPrivateKey = localPrivateKey.toString();
                localPass = localPass.toString();
                localStorekeys(pubkey,localPrivateKey,localPass,$scope.newName);
                // encrypt keys and send to cloud
                var privateKey = encryptKeys(privkey,words)
                var pass = encryptKeys($scope.passphrase,words)
                privateKey = privateKey.toString()
                pass = pass.toString();
                storekeys(pubkey,privateKey,pass,$scope.newName)
                console.log('keys sent to cloud');
              }).catch(function (error){
                console.log(error.code + '\n' + error.message);
              })
            }else{
              error('Por favor llene todos los campos')
            }    
        }
    
    $scope.getKeyname = function (name){
      $localStorage.keyDelete = name;
      
    }
        
    $scope.deleteKeys  =  function (){

      name = $localStorage.keyDelete;
      var deleteRequest = $.param({
        name: name
      })

      $http({
        url: 'https://sharekey.herokuapp.com/profile/' + $localStorage.uid + '/deleteKey',
        method: 'DELETE',
        data: deleteRequest,
        headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
      }).then(function (response){
            if (response.status == 200){
              alert('Se ha borrado una llave');
              delete $localStorage.keyDelete;
              $state.reload();
            }
        }).catch(function (e){
          if (e.status == 401){
              error('Su sesion ha vencido por inactividad')
              $location.path('/login');
            }
          })
    }

  })            