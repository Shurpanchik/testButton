/*-----------------------------------------------------------------------------
A simple "Hello World" bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify  = require('restify');
var builder  = require('botbuilder');
var route 	 = require('./route.json');


//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 8888, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
   appId: '221a8268-52b6-40e7-84b6-36ac009d6027',
    appPassword: 'JpwiLtYqxFoOjtdBF8a8cjZ'
	//appId: process.env.MICROSOFT_APP_ID,
    //appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

var answerMap = new Map();

//=========================================================
// Functions for set Questions
//=========================================================

// метода printQuestion() выводит на экран вопрос с вариантами ответов
function printQuestion(textQuestion,choiseAnswer ){
return function (session) {
       builder.Prompts.choice(session,textQuestion , choiseAnswer, { 
		listStyle: builder.ListStyle.button,
		retryPrompt : textQuestion
	   });
    }
}

// метод routingAnswer() запоминает ответ на вопрос и перенаправляет к другому вопросу без учета результата предыдущих вопросов
function routingAnswer (url, choiseAnswerQuestion,choiseRoute, textQuestion ){
return function (session, results) {
			if(answerMap.has(url)){answerMap.delete(url);}
			answerMap.set(url,{
				text : textQuestion,
				choiceAnswer : choiseAnswerQuestion,
				answerUser : choiseAnswerQuestion[results.response.index]
				});
			session.beginDialog(choiseRoute[results.response.index]);
    }	
}

// setQuestion() задает вопрос и запоминает ответ без учета предыдущих вопросов
function   setQuestion(url, textQuestion,choiseAnswer,choiseRoute){
return [printQuestion(textQuestion,choiseAnswer ), routingAnswer (url, choiseAnswer,choiseRoute, textQuestion ),function (session, results) {
        session.endDialogWithResult()
    }];
}

// routingAnswerProxy() запоминает ответ на вопрос и перенаправляет к другому вопросу с учетом результатов предыдущих вопросов
function routingAnswerProxy (url, choiceAnswerQuestion,urlPrev,choiceAnswerPrev,choiceRoute, textQuestion ){
return function (session, results) {
	
		if(answerMap.has(url)){answerMap.delete(url);}
		answerMap.set(url,{
			text : textQuestion,
			choiceAnswer : choiseAnswerQuestion,
			answerUser : choiseAnswerQuestion[results.response.index]
				});
		session.beginDialog(choiseRoute[results.response.index]);
	
		for(var i=0;i<choiceAnswerPrev.length;i++){
			if(answerMap.get(urlPrev)==choiceAnswerPrev[i]){
			session.beginDialog(choiceRoute[i]);
			}
		}
    }	
}

// задает вопрос и запоминает ответ с учетом результатов предыдущих вопросов
function   setQuestionProxy(url, textQuestion, choiceAnswer,urlPrev,choiceAnswerPrev,choiceRoute){
return [printQuestion(textQuestion,choiceAnswer ), routingAnswerProxy (url, choiceAnswer,urlPrev,choiceAnswerPrev,choiceRoute, textQuestion ),function (session, results) {
        session.endDialogWithResult()
    }];
}
// добавляет диалог с вопросом
function setDialog(q){
bot.dialog(q.url, 
  setQuestion(	
			q.url,
			q.text,
			q.choiceAnswer, 
			q.choiceRouting
			)		
);
}
// инциализация мапы с информацией о вопросе по url (если надо хранить все вопросы)
function setAnswerMap(){
	for(var q in route){
	answerMap.set(route[q].url,  {
		text: route[q].text,
		choiceAnswer :  route[q].choiceAnswer,
		answerUser : 'На вопрос не отвечали'
		})
	}
}
//=========================================================
// Bots Dialogs
//=========================================================
bot.dialog('/', [
	function (session, result) {
		session.send('Здравствуйте, Вас приветствует бот Мужкометр!')
		builder.Prompts.text(session, 'Представьтесь, пожалуйста, боту')
	},
	function (session, result) {
		session.userData.nameUser = result.response;
		builder.Prompts.choice(session, 'Главное меню', 'Начать тест|Написать доктору', {
			listStyle: builder.ListStyle.button,
			retryPrompt: "Выберите вариант из списка предложенных"
		});
	},
	function (session, result) {
		if (result.response.index == 0) {
			session.beginDialog('/ready')
		} else {
			session.beginDialog('/sendFirstMessageToDoctor')
		}
	}
]);

bot.dialog('/inprogress', 
function (session) {
	var dataResultPoll =''; 
		if(answerMap.size==0){
		dataResultPoll='Вы ответили на 0 вопросов';
		}
		else{
			for (var val of answerMap.values()) {
				dataResultPoll = dataResultPoll+ '\n\n\n\n' + 'На вопрос: '+ val.text + '\n\n'+ ' Вы ответили: ' + val.answerUser  ;	
			}
		}
    session.send(dataResultPoll);
	answerMap.clear();
	session.beginDialog('/');
    }
);
bot.dialog('/start', [
    function (session) {
		answerMap.clear();
        session.beginDialog('/')
    },
]);
bot.dialog('/menu', [
    function (session) {
		answerMap.clear();
        session.beginDialog('/')
    },
]);bot.dialog('/sendFirstMessageToDoctor', [
	function (session) {
		builder.Prompts.text(session, 'Напишите свой вопрос специалисту:')
	},
	function (session, result) {
		// здесь должна быть логика отправки сообщения всем докторам с кнопкой
		// положить сообщение в базу
		// пока сделаем конкретному kleines_stofftier        
		var msg = new builder.Message()
			.address(JSON.parse('{"id":"1486381282451","channelId":"skype","user":{"id":"29:1E68fgb7x7pfbNXX7z-3Jjr9JlVMuJqS2yTu9tTN42v3t6BsADH1fZ8OMoSQb0Ym-","name":"Татьяна Шур"},"conversation":{"id":"29:1E68fgb7x7pfbNXX7z-3Jjr9JlVMuJqS2yTu9tTN42v3t6BsADH1fZ8OMoSQb0Ym-"},"bot":{"id":"28:221a8268-52b6-40e7-84b6-36ac009d6027","name":"firstKoala23112016_bot"},"serviceUrl":"https://smba.trafficmanager.net/apis/","useAuth":true}'))
			.text(result.response)
			.attachments([
				new builder.HeroCard(session)
					.buttons([builder.CardAction.dialogAction(session, 'sendMessageToPatient', JSON.stringify({
						"text": result.response,
						"address": JSON.stringify(session.message.address)
					}), 'Ответить')])
			]);
		bot.send(msg, function (err) {
			if (err == undefined) {
				session.send("Ваш вопрос успешно доставлен");
			}
			else {
				session.send("Ваш вопрос не дошел до доктора. Попробуйте задать его позже");
			}
		});
	},
	function (session) {
		session.endDialog()
	}
]);

bot.dialog('sendMessageToPatient', [
	function (session, result) {
		console.log(result)
		if (result.data) {
			session.userData.textquestion = JSON.parse(result.data)['text'];
			session.userData.addressClient = JSON.parse(result.data)['address'];
			builder.Prompts.text(session,"Напишите ответ ");
		} else {
			session.endDialog('Серверная ошибка');
		}
	},
	function (session, result) {
		var msg = new builder.Message()
			.address(JSON.parse(session.userData.addressClient))
			.text("Вы отправляли сообщение " + session.userData.textquestion + ' Вам ответили: ' + result.response)
			.attachments([
				new builder.HeroCard(session)
					.buttons([builder.CardAction.dialogAction(session, 'sendMessageToPatient', JSON.stringify({
						"text": result.response,
						"address": JSON.stringify(session.message.address)
					}), 'Ответить')])
			]);
			
		bot.send(msg, function (err) {
			if (err == undefined) {
				session.send("Ваш ответ успешно доставлен");
			}
			else {
				session.send("Ваш ответ не дошел до адресата. Попробуйте отправить его позже");
			}
		});
	}
])

bot.beginDialogAction('sendMessageToPatient', 'sendMessageToPatient', {matches: /^\/?sendMessageToPatient (\d+)/i});
bot.beginDialogAction('start', '/start', {matches: /^\/?start/i});
bot.beginDialogAction('menu', '/menu', {matches: /^\/?menu/i});


setDialog(route.ready);
setDialog(route.AreYouInAnyPain);
setDialog(route.AreYouInAnyPain_Wo);
setDialog(route.AreYouInAnyPain_Wo_bottomStomachhow);
setDialog(route.AreYouInAnyPain_Wo_bottomStomach_how_oftenurine);
setDialog(route.AreYouInAnyPain_Wo_bottomStomach_howoften_urine_difficulturine);
setDialog(route.AreYouInAnyPain_Wo_bottomStomach_how_go);
setDialog(route.AreYouInAnyPain_Wo_bottomStomach_how_oftenurine_difficulturine_all);
setDialog(route.AreYouInAnyPain_Wo_bottomStomach_how_bloodurine);
setDialog(route.AreYouInAnyPain_Wo_another_itch);
setDialog(route.AreYouInAnyPain_Wo_another_burn);
setDialog(route.AreYouInAnyPain_Wo_another_discomfort);
setDialog(route.AreYouInAnyPain_Wo_another_penispain);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_in_excreta);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_out_openhead);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_all_erection);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_in_excreta_color);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_out_openhead_all);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_out_openhead_head_red);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_out_openhead_head_rush);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_out_openhead_head_peeling);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_out_openhead_head_warts);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_out_openhead_head_smell);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_out_openhead_head_deform);
setDialog(route.AreYouInAnyPain_Wo_another_penispain_all_erection_deform);
setDialog(route.DoYouHaveAviolationOfUrination);
setDialog(route.DoYouHaveAviolationOfUrination_any_oft);
setDialog(route.DoYouHaveAviolationOfUrination_any_pain);
setDialog(route.DoYouHaveAviolationOfUrination_any_sluggishstream);
setDialog(route.DoYouHaveAviolationOfUrination_any_difficulty);
setDialog(route.DoYouHaveAviolationOfUrination_any_newsnine);
setDialog(route.YouHaveChangedTheColorOfTheUrine);




