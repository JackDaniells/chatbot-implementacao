var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var url = 'http://portal.uros.cloud/';

var FileCookieStore = require('tough-cookie-filestore');
// NOTE - currently the 'cookies.json' file must already exist!
var j = request.jar(new FileCookieStore('cookies.json'));
request = request.defaults({ jar : j })

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    /*appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD*/
    appId: '4bacbab9-c056-4979-b5e9-264423dbc522',
    appPassword: '7kLJwMTJ4VizNSTtPCe9C0o'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', function (session) {
    session.send("Desculpe, não reconheci seu comando, tente uma das opções abaixo");
    session.beginDialog('rootMenu');
});

bot.dialog('/Ola', function (session) {
    session.send("Ola, eu sou o assistente pessoal do Uros, em que eu posso ajudar?");
    session.beginDialog('rootMenu');
});

bot.dialog('rootMenu', [
    function (session) {
        builder.Prompts.choice(session, "Selecione uma opção:", 'Login|Sair');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                session.beginDialog('login');
                break;
            default:
            	session.send('Até mais :)');
                session.endDialog();
                break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('rootMenu');
    }
]).reloadAction('showMenu', null, { matches: /^(menu|back)/i });


bot.dialog('login',[

	function (session) {
    	 builder.Prompts.text(session,"Insira o nome de usuario");
	},

	function (session, results) {
       session.userData.username = results.response;
       builder.Prompts.text(session,"Agora insira a senha");

	},

	function(session, results) {
		 session.userData.password = results.response;

		request(url + 'api/auth/signin',{
			method: 'POST',
			form: {
				username: session.userData.username,
				password: session.userData.password
			},
		}, function(error, response, body) {

		 	if (!error && response.statusCode == 200) { 
		 		session.userData.central = JSON.parse(body).central;
				console.log(session.userData.central);
				session.send("Login realizado com sucesso");
				session.beginDialog('DeviceFunctions');
		 	}else{
		 		session.send("Erro ao efetuar login");
		 	} 

		});
	
	}

]);



bot.dialog('DeviceFunctions',[ 
 function (session) {
        builder.Prompts.choice(session, "Selecione uma das opções ao lado:", 'Ver histórico|Abrir Porta|Adicionar Acesso|Remover Acesso|Sair');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                session.beginDialog('PirHistory');
                break;
            case 1:	
            	session.beginDialog('OpenDoor');
            	break;
            case 2:	
            	session.beginDialog('AddCard');
            	break;
            case 3:	
            	session.beginDialog('DelCard');
            	break;
            default:
                session.endDialog();
                break;
        }
    }
]);


bot.dialog('OpenDoor', [
	function(session) {
		builder.Prompts.text(session, 'Digite a senha para abertura da porta');

	},

	function(session, results){

			
		request(url + 'api/centrals/openDoor/'+session.userData.central,{
			method: 'POST',
			form:{
				password: results.response
			}
		}, function(error, response, body) {
		 	if (!error && response.statusCode == 200) { 
		 		console.log(body);
		 		session.send('Porta Aberta');
		 		session.beginDialog('DeviceFunctions');
		 	}else{
		 		console.log('deu pau');
		 		session.endDialog('Porta Não foi aberta');
		 	} 
		});

	}
]);

bot.dialog('PirHistory',[
 	function(session){

		request(url + 'api/dispositivos', function(error, response, body) {
				if (!error && response.statusCode == 200) { 
					var dispositivos = JSON.parse(body);
					var select ='{ ';

					for(var i in dispositivos){
						
						select += '"' + dispositivos[i].nome +'":{ "id": "' + dispositivos[i]._id +'"},';
					}
					select = select.substr(0, select.length -1);
					select +='}';
					select = JSON.parse(select);
					session.userData.dispositivos = select;



					builder.Prompts.choice(session, 'Selecione o Dispositivo para acessar o histórico', select);

				} else {
					session.send('Algo deu errado');
					session.beginDialog('DeviceFunctions');

				}

			});
	},

	function(session, results){
		console.log(results.response.entity);

		for(var i in session.userData.dispositivos){
			if(i == results.response.entity){
				console.log(session.userData.dispositivos[i]);

				request(url + 'api/dispositivos/' + session.userData.dispositivos[i].id + '/historico', function(error, response, body) {
					if (!error && response.statusCode == 200) { 
						var history = body.substr(1, body.length-2);
						console.log(history);
						history = history.split(',');
						var count = 0;

						for(var i = 0; i<history.length; i++){
							if(history[i]!= 'null'){
								session.send(history[i]);
								count++;
							}
						}

						if(!count){
							session.send('Nenhum histórico neste dispositivo');
						}
						session.beginDialog('DeviceFunctions');
					}
				});


			}
		}


	}
]);

bot.dialog('AddCard',[
	function(session){
		builder.Prompts.text(session, 'Digite o nome do dono do cartão');
	},
	function(session, results){
		session.userData.cardName = results.response;
		builder.Prompts.text(session, 'Digite o numero do cartão');
	},
	function(session, results){
		session.userData.cardId = results.response;

		request(url + 'api/centrals/AddCard/' + session.userData.central, {
			method:'POST',
			form:{
				name: session.userData.cardName,
				id_card: session.userData.cardId
			}
		}, function(error, response, body) {
			if (!error && response.statusCode == 200) { 
				session.userData.cardName = session.userData.cardId = null;
				session.send('Novo cartão adicionado');
				session.beginDialog('DeviceFunctions');
			} else {
				session.send('Algo deu errado');
				session.beginDialog('DeviceFunctions');
			}
		});

	}
]);


bot.dialog('DelCard',[
	function(session){
		request(url + 'api/centrals/cardlist/' + session.userData.central, function(error, response, body) {
			if (!error && response.statusCode == 200) { 
				var cards = JSON.parse(body);
				var select = '';
				for(var i in cards.validCards){
					select += cards.validCards[i].name + '|';
				}
				select += 'Sair';

				builder.Prompts.choice(session, 'Selecione qual usuário você deseja remover', select);


			} else {
				session.send('Algo deu errado');
				session.beginDialog('DeviceFunctions');
			}


		});

	}, 
	function(session, results){
		var response = results.response.entity;
		if(response == 'Sair'){
			session.beginDialog('DeviceFunctions');
		}else {
			request(url + 'api/centrals/delcard/' + session.userData.central, {
				method: 'POST',
				form:{
					name: response
				}
			}, function(error, response, body) {
				if (!error && response.statusCode == 200) { 
					console.log(body);
					session.send('Usuario Removido');
					session.beginDialog('DeviceFunctions');

				} else {
					console.log(body);
					session.send('Algo deu errado');
					session.beginDialog('DeviceFunctions');
				}
			});
		}
	}

]);


