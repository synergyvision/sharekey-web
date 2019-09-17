(function() {

    angular
      .module('sharekey')
      .config(translator);
  
      translator.$inject = ['$translateProvider'];
      function translator($translateProvider) {
  
        $translateProvider.useSanitizeValueStrategy('sanitizeParameters');
  
        $translateProvider.useStaticFilesLoader({
          prefix: "lang/",
          suffix: ".json"
        });
  
        $translateProvider.preferredLanguage('es');
      }
  
  })();