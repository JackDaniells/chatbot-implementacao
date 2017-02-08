/*var request = require('request')
,   cachedRequest = require('cached-request')(request)
,   cacheDirectory = "/tmp/cache";
 
cachedRequest.setCacheDirectory(cacheDirectory);

cachedRequest({
	url:'http://portal.uros.cloud/api/auth/signin',
	method:'POST',
	form: {
		username:'uros',
		password:'uros1234'
	}
},function(err,res,body){
  console.log(body);

 cachedRequest({
	url:'http://portal.uros.cloud/api/centrals',
	method:'GET'
},function(err,res,body){
  
	console.log('Centrais');
  console.log(body);
});


});*/

var request  = require('request'),
  redis = require('redis'),
  url = 'http://portal.uros.cloud/';

var FileCookieStore = require('tough-cookie-filestore');
// NOTE - currently the 'cookies.json' file must already exist!
var j = request.jar(new FileCookieStore('cookies.json'));
request = request.defaults({ jar : j })


request(url + 'api/auth/signin',{
		method: 'POST',
		form: {
			username: 'uros',
			password: 'uros1234'
		},

	}, function(error, response, body) {
	 	if (!error && response.statusCode == 200) { 
	 		console.log(JSON.parse(body).central);
	 	}else{
	 		console.log('deu pau');
	 	} 
	});


/*request(url + 'api/centrals', function(error, response, body) {
	 	if (!error && response.statusCode == 200) { 
	 		console.log(body);
	 	}else{
	 		console.log('deu pau');
	 	} 
	});*/


	request(url + 'api/dispositivos', function(error, response, body) {
			if (!error && response.statusCode == 200) { 
				var dispositivos = JSON.parse(body);
				var select ='{ ';

				for(var i in dispositivos){
					
					select += '"' + dispositivos[i].nome +'":{ "id": "' + dispositivos[i]._id +'"},';
				}
				select = select.substr(0, select.length -1);
				select +='}';



				console.log(JSON.parse(select));

			} else {

			}

		});


