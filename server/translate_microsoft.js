'use strict';

var querystring = require('querystring');
var https = require('https');
var config = require('../config/config');
var RSVP = require('rsvp');
RSVP.on('error', function(reason) {
  console.assert(false, reason);
});

function performSimpleRequest(headers, host, endpoint, method, data, dataString, success, error) {
  headers = headers || {};
  
  if (method === 'GET' && data) {
    var queryStringFormated = querystring.stringify(data)
    endpoint += '?' + queryStringFormated;
  }
  else if(headers === {} && dataString){
    console.log('\n default headers:', 'application/json\n')
    headers = {
      'Content-Type': 'application/json',
      'Content-Length': dataString.length
    };
  }
  var options = {
    host: host,
    path: endpoint,
    method: method,
    headers: headers
  };

  console.log('\n options: ', options);

  console.log('\n requesting...');
  var req = https.request(options, function(res) {
  
    res.setEncoding('utf-8');

    var responseString = '';

    res.on('data', function(data) {
      console.log('data received');
      responseString += data;
    });

    res.on('end', function() {
      console.log(responseString);
      try{
        success(JSON.parse(responseString));  
      }
      catch(err){
        success(responseString);
      }
    });
  });

  req.on('error', function(e) {
    error(err);
    console.error('error');
    console.error(e);
  });  

  req.write(dataString);
  req.end();
}

module.exports = function() {
  this.getAccessToken = function() {
  
    var promise = new RSVP.Promise(function(resolve, reject) {

      var data = 'scope=' +  encodeURIComponent(config.scope);
      data += '&client_secret=' +  encodeURIComponent(config.client_secret);
      data += '&grant_type=' +  encodeURIComponent(config.grant_type);
      data += '&client_id=' +  encodeURIComponent(config.client_id);

      var headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      };

      performSimpleRequest(headers,
        'datamarket.accesscontrol.windows.net',
        'https://datamarket.accesscontrol.windows.net/v2/OAuth2-13',
        'POST',
        data,
        data,
        function(responseObject) {
          resolve(responseObject);
        },
        function(err) {
          reject(err);
        }
      );
      
    });
    
    return promise;
  };

  this.translate = function(accessToken, text, lang1, lang2) {

    var promise = new RSVP.Promise(function(resolve, reject) {

      var uri = 'http://api.microsofttranslator.com/v2/Http.svc/Translate';

      var authToken = 'Bearer' + ' ' + accessToken.access_token;

      var headers = {
        'Authorization': authToken
      };

      var data = {
        text:  text,
        from: lang1,
        to:   lang2
      };

      console.log('sending translating request...');

      performSimpleRequest(headers,
        'api.microsofttranslator.com',
        uri,
        'GET',
        data,
        JSON.stringify(data),
        function(responseObject) {
          resolve(responseObject);
        },
        function(err) {
          reject(err);
        }
      );
      
    });
    
    return promise;
  };
};