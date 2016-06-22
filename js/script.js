// var APIKEY = "43bcbd9c821513cf95efd29956339792155c7ed3"; //regan
var APIKEY = "3ddc099bbb19af0cd00f41ee78920c7b2bb90f7d"; //kyle1
//var APIKEY = "a2a76189999ce286d4a26875b8ec1d37eec6fc4e"; //kyle2
// var APIKEY = "88d4c0a96e942887a933223c884fb6281dcebafc"; //anthony

// array of city objects
var cities = [
  {name: "New York", center: {lat: 40.714, lng: -74.005}, population: 8491079},
  {name: "San Francisco", center: {lat: 37.775, lng: -122.419}, population: 852469},
  {name: "Chicago", center: {lat: 41.878, lng: -87.629}, population: 2722389},
  {name: "Houston", center: {lat: 29.760, lng: -95.370}, population: 2239558},
  {name: "Atlanta", center: {lat: 33.749, lng: -84.388}, population: 4500000}
];

// define angular app
var app = angular.module('app', ['ngRoute']);

// define routing
app.config(function($routeProvider) {
  $routeProvider
  .when('/map', {
    templateUrl: 'map.html',
    controller: 'MapController',
    activetab: 'map'
  })
  .when('/url-analyzer', {
    templateUrl: 'url-analyzer.html',
    controller: 'AnalyzerController',
    activetab: 'url-analyzer'
  })
  .when('/text-analyzer', {
    templateUrl: 'text-analyzer.html',
    controller: 'AnalyzerController',
    activetab: 'text-analyzer'
  })
  .otherwise({redirectTo: '/url-analyzer'});
});

// analyzer controller depends on the alchemy service and handles storing service results on the scope.
app.controller('AnalyzerController', function($scope, Alchemy) {
  // analyzeUrl is called when the form is submitted on url-analyzer.
  $scope.analyzeUrl = function(url) {
    Alchemy.urlData(url, function(response) {
      $scope.sentiment = response.data.docSentiment.type;
      $scope.sentimentScore = response.data.docSentiment.score;
      $scope.text = response.data.text;
    });

    //retrieve emotion results from the url
    Alchemy.getEmotions(url, function(response) {
      $scope.emotions = response.data.docEmotions;
    });
  }; //end analyzeUrl function

  // analyzeText is called when the form is submitted on text-analyzer.
  $scope.analyzeText = function(text) {
    Alchemy.textData(text, function(response) {
      $scope.sentiment = response.data.docSentiment.type;
      $scope.sentimentScore = response.data.docSentiment.score;
      $scope.text = response.data.text;
      $scope.stars = 0;

      // Extract this into a separate function to make this code shorter.
      //logic display number of stars from the submitted text
      if($scope.sentimentScore === 1) {
        $scope.stars = 5;
      } else if ($scope.sentimentScore >= 0.75) {
        $scope.stars = 4.5;
      } else if ($scope.sentimentScore >= 0.5) {
        $scope.stars = 4;
      } else if ($scope.sentimentScore >= 0.25) {
        $scope.stars = 3.5;
      } else if ($scope.sentimentScore >= 0) {
        $scope.stars = 3;
      } else if ($scope.sentimentScore >= -0.25) {
        $scope.stars = 2.5;
      } else if ($scope.sentimentScore >= -0.5) {
        $scope.stars = 2;
      } else if ($scope.sentimentScore >= -0.75) {
        $scope.stars = 1.5;
      } else {
        $scope.stars = 1;
      }
      $scope.starsImg = "stars/" + $scope.stars + ".png";
      if ($scope.sentimentScore) {
        $scope.showStars = true;
      } else {
        $scope.showStars = false;
      }
    });
  };

});

//controller to show active tab depending on route
app.controller('RouteChangeController', ['$scope','$route', '$rootScope', function(sc, $route, $rootScope) {
  //change activetab when route changes
  $rootScope.$on("$routeChangeSuccess", function(event, current, previous) {
    if (current.$$route != null) {
      sc.activetab = current.$$route.activetab;
    }
  });
}]);

// MapController creates a map and circles for each city
app.controller('MapController', function(GoogleMapsService, Alchemy, $scope) {
  $scope.resultSet = [];

  var map = GoogleMapsService.createMap();
  GoogleMapsService.showLegend(map);
  // variable to set zoom level depending on screen size
  var bounds = new google.maps.LatLngBounds();

  //get articles for each city
  cities.forEach(function(city) {
    //Alchemy.getData(city.name, searchQuery, function(response) {
    Alchemy.getJsonFile(city.name, 'searchQuery', function(response) {
      // log error
      if (response.data.status === "ERROR") {
        console.log('Response status was ERROR', response.data.statusInfo);
        return;
      }
      //push each city's result to resultSet array
      $scope.resultSet.push(response.data.result.docs);
      //calculate average Sentiment score, calculating number of positive, negative, neutral articles and the number of total articles.


      // Go all-in with functional programming to reduce the code length
      // for this loop.
      var avgSentiment = 0;
      var totalSentiment = 0;
      var numberArticles = 0;
      var numberPostive = 0;
      var numberNegative = 0;
      var numberNeutral = 0;
      response.data.result.docs.forEach(function(article) {
        var sentimentScore = article.source.enriched.url.docSentiment.score;
        if (article.source.enriched.url.docSentiment.type === 'positive') {
          numberPostive++;
        } else if (article.source.enriched.url.docSentiment.type === 'negative') {
          numberNegative++;
        } else {
          numberNeutral++;
        }
        totalSentiment += sentimentScore;
        numberArticles++;
      });
      city.numberArticles = numberArticles;
      city.numberPostive = numberPostive;
      city.numberNegative = numberNegative;
      city.numberNeutral = numberNeutral;

      avgSentiment = Number(totalSentiment / numberArticles);
      //set avgSentiment per city
      city.avgSentiment = avgSentiment;
      // figuring out the radiusSize for circle based on ratio of positive, negative and neutral articles to total articles
      var fillColor;
      var radiusSize;
      if (city.avgSentiment >= 0.1) {
        fillColor = "#8FB996"; //green for positive sentiment
        radiusSize = city.numberPostive / city.numberArticles * 100;
      } else if (city.avgSentiment <= -0.01) {
        fillColor = "#A20900"; //red for negative sentiment
        radiusSize = city.numberNegative / city.numberArticles * 100;
      } else {
        fillColor = "#0353A4"; //blue for neutral
        radiusSize = city.numberNeutral / city.numberArticles * 100;
      }
      radiusSize *= 300000;
      var circle = GoogleMapsService.createCircle("#ccc", fillColor, city.center, map, radiusSize); //parameters are strokeColor, fillColor, center, map
      bounds.extend(circle.getCenter()); //gets the center of a circle
      // add event listener to display city articles when the circle is clicked
      circle.addListener('click', function() {
        Alchemy.getJsonFile(city.name, 'searchQuery', function(response) {
          console.log(response);
          $scope.cityName = city.name;
          $scope.articles = response.data.result.docs;
        });
      });
      map.fitBounds(bounds); // sets zoom for the map so that all circles are visible
      console.log(response);
    }, function(response) {
      alert('API Error. Check Console!');
      console.log('API Error was: ', response);
    });
  });
});

// Alchemy service calls AlchemyAPI with proper parameters
// getData method calls the API
// getJsonFile gets data from /json/<city>.json
// urlData method calls the API to return a sentiment for a specific URL
// textData method calls the API to return a sentiment from a review/text
// getEmotions methods calls the API to return an emotion from articles in cities
app.factory('Alchemy', function($http) {
  return {
    getData: function(city, searchQuery, callback, errorCallback) {
      $http({
        url: "https://gateway-a.watsonplatform.net/calls/data/GetNews",
        params: {
          apikey: APIKEY,
          outputMode: 'json',
          start: "now-3h",
          end: "now",
          count: 5,
          return: "enriched",
          'q.enriched.url.title': city,
          'q.enriched.url.text': searchQuery
        }
      }).then(callback, errorCallback);
    },
    getJsonFile: function(city, searchQuery, callback, errorCallback) {
      $http({
        url: "json/" + city + ".json"
      }).then(callback, errorCallback);
    },
    urlData: function(url, callback) {
      $http({
        url: "http://gateway-a.watsonplatform.net/calls/url/URLGetTextSentiment",
        params: {
          apikey: APIKEY,
          url: url,
          outputMode: 'json',
          showSourceText: 1
        }
      }).then(callback);
    },
    textData: function(text, callback) {
      $http({
        url: 'http://gateway-a.watsonplatform.net/calls/text/TextGetTextSentiment',
        params: {
          apikey: APIKEY,
          text: text,
          outputMode: 'json',
          showSourceText: 1
        }
      }).then(callback);
    },
    getEmotions: function(url, callback) {
      $http({
        url: "http://gateway-a.watsonplatform.net/calls/url/URLGetEmotion",
        params: {
          apikey: APIKEY,
          url: url,
          outputMode: 'json'
        }
      }).then(callback);
    }
  };
});

// GoogleMapsService service returns an object with two methods
// createMap returns a new Google map
// createCircle returns a new circle
app.factory('GoogleMapsService', function() {

  return {
    createMap: function() {
      var mapElement = document.getElementById('map');
      return new google.maps.Map(mapElement, {
        center: {lat: 39.099727, lng: -94.578567}
      });
    },
    createCircle: function(strokeColor, fillColor, center, map, population) {
      return new google.maps.Circle({
        strokeColor: strokeColor,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: fillColor,
        fillOpacity: 0.65,
        map: map,
        center: center,
        radius: Math.sqrt(population) * 100
      });
    },
    showLegend: function(map) {
      //show legend on map
      var legend = document.getElementById('legend');
      map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(legend);
    }
  };
});

// angular directive for search form
app.directive('searchForm', function() {
  return {
    restrict: 'E',
    templateUrl: 'search-form.html'
  };
});

//angular directive for results
app.directive('results', function() {
  return {
    restrict: 'E',
    templateUrl: 'results.html'
  };
});
