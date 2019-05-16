const OracleBot = require('@oracle/bots-node-sdk');
const { messageModelUtil } = require('./lib/MessageModel/messageModelUtil.js');
const { WebhookClient, WebhookEvent } = OracleBot.Middleware;
const bodyParser = require('body-parser');
const _ = require('underscore');
// google
const PubSub = require('pubsub-js');
PubSub.immediateExceptions = true;
const { dialogflow, SignIn } = require('actions-on-google');
const assistant = dialogflow({debug: true, clientId:'368886720564-ffahuvlrge7h59qks2n0t1o7lbujnodt.apps.googleusercontent.com',});
var userlocale = '';
var userId = '';

module.exports = (app) => {
  const logger = console;
  // this will add body-parser
  OracleBot.init(app, {
    logger,
  });
  // dados do webhook (Channel do PBCS em Portugues)

  const webhook = new WebhookClient({
    // determine the channel config on incoming request from ODA
    channel: (req) => {
      logger.info('Here', req.params);
      const { locale } = req.params;
      var url = '';
      var secret = '';

      switch(locale) {
        case 'es': {
          // ...
           url = 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/39b5e36b-dbdc-49f6-923a-ec8fc3b565b6';
           secret= 'CIhEYKrRu26ftxRysC1C3d0rn8sT2odo';
           logger.info('Channel being used-ES : ', url);		  
           break;
        }   
        case 'pt': {
          // ...
           url= 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/291868e7-1eeb-490d-9fe5-c84362f34492';
           secret= 'BpZMnlY64tzVoBZHRtcgNvvs90ZE8lN6';
           logger.info('Channel being used-PT : ', url);		  
          break;
        }  
      }
      return {
        url,
        secret,
      };
    },
  });

    
  webhook
  .on(WebhookEvent.ERROR, err => logger.error('Error:', err.message))
  .on(WebhookEvent.MESSAGE_SENT, message => logger.info('Message to chatbot:', message));
  // .on(WebhookEvent.MESSAGE_RECEIVED, message => logger.info('Message from chatbot:', message))

  // Need pub/sub storage

  // https://my.ngrok.io/bot/message/es-ES <=== configure this in ODA per channel/locale
  app.post('/bot/message/:locale', webhook.receiver((req, res) => {
    const { locale } = req.params;
    res.sendStatus(200);
     const body = req.body;
     const userId = body.userId;
     logger.info("Publishing to", userId);
     PubSub.publish(userId, req);
    
  }));

  
  assistant.intent('Default Fallback Intent', (conv) => {
    
    logger.info('Got query : ', conv.query);
    logger.info('qual a conversation total : ', JSON.stringify(conv));
//as the Chatbot has only resource Bundles for es-Es or es-419 (Mexico), transform to es-419
  
    userlocale = conv.user.locale;

    if (userlocale.substring(0,2) === 'es') {userlocale = 'es-419'};


    if (conv.user.profile.payload.given_name === '') {
// If given_name is blank means that it is a new user, so will start a SIGN_IN process in Google to get users details	
      logger.info('Starting Signin proccess');
// set initial channel to portuguese CHATBOT	      
      if (userlocale === 'pt-BR') {
	  
//     If locale is portugues from  Brasil, start sign-in informing the reason
//     Message means - To get you Google account details, like name and email, answer YES (Sim)
        conv.ask(new SignIn('Para pegar os detalhes da sua conta do Google, como nome e email, responda Sim'));
      }
      else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
//     If locale is Spanish, start sign-in informing the reason
//     Message means - To get you Google account details, like name and email, answer YES (Sim)
        conv.ask(new SignIn('Para tenermos los detalles de su cuenta de Google, como nombre y email, conteste Sí'));
      }  
      logger.info('Got out of Signin');
      userId = 'anonymus';
    } else {
// I have user given_name in message, so he already SIGNED IN and I have his name and email

      logger.info('Account linking went ok, and his locale is: ', userlocale);
      userpayload = conv.user.profile.payload;
      userId = userpayload.sub;
      logger.info('I am in fefault Fallback - This is users User ID: ', userId);
      userName = userpayload.given_name;
      logger.info('I am in fefault Fallback - This is users given_name: ', userName);
    }
    logger.info('Account Linking rolou no default fallback, dados de locale são: ', userlocale);
// set initial channel to portuguese CHATBOT	
    var channeloc= {
      url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/291868e7-1eeb-490d-9fe5-c84362f34492',
      secret: 'BpZMnlY64tzVoBZHRtcgNvvs90ZE8lN6',
    };
// if portuguese - set channel to portuguese CHATBOT	
    if (userlocale === 'pt-BR') {
      channeloc= {
        url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/291868e7-1eeb-490d-9fe5-c84362f34492',
        secret: 'BpZMnlY64tzVoBZHRtcgNvvs90ZE8lN6',
      };
      logger.info('Channel being used: ', channeloc);
    }
// if Spanish - set channel to Spanish CHATBOT	
    else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
      channeloc = {
        url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/39b5e36b-dbdc-49f6-923a-ec8fc3b565b6',
        secret: 'CIhEYKrRu26ftxRysC1C3d0rn8sT2odo',
      };
      logger.info('Channel being used: ', channeloc);
    }  
    
    // const webhook = new WebhookClient({
    //         // determine the channel config on incoming request from ODA
    //   channel: (req) => {
    //     // Promise is optional
    //     return Promise.resolve({
    //       url: channeloc.url, // channel url specific to the incoming ODA request
    //       secret: channeloc.secret, // channel secret specific to the incomint ODA request
    //     });
    //   },
    // });
    

    // 

    return new Promise(function (resolve, reject) {
      const MessageModel = webhook.MessageModel();

      var additionalProperties = {
        profile: {
          clientType: "google",
          locale: userlocale			
        }
      };
      var messagePayload = MessageModel.textConversationMessage(conv.query);
      const message = _.assign({ userId, messagePayload }, additionalProperties);
      logger.info('Message montado: ', JSON.stringify(message));
      var treatandsendtoGoogle =  function (msg, data) {
        logger.info('Data from chatbot:', data);
        logger.info('Message from chatbot:', msg)
        logger.info('Conversa que veio do Google: ', conv)
        var texto1 = '';
        var texto2 = '';
        texto1 = data.body.messagePayload.text;
          
        logger.info('texto 1 antes de tratar actions : ', JSON.stringify(texto1));
        logger.info('actions : ', JSON.stringify(data.body.messagePayload.actions));
// usually my messages sent from Chatbot have a text and some actions (options I give to the user)
        if (data.body.messagePayload.actions){
            texto2 = actionsToText(data.body.messagePayload.actions,texto1);
            texto1 = '';
        }
        logger.info('texto 2 ', JSON.stringify(texto2));
        PubSub.unsubscribe(userId);
        conv.ask('<speak>'+texto1+texto2+'</speak>');
        resolve();
      };		
 	  
	    PubSub.subscribe(userId, treatandsendtoGoogle)	  
      logger.info('messagepayload : ', message.messagePayload);
      logger.info('Additional Properties - profile : ', additionalProperties);      
      webhook.send(message, channeloc)
      .catch(err => {
        logger.info('Failed sending message to Bot');
        conv.ask('Failed sending message to Bot.  Please review your bot configuration.');
        reject(err);
        PubSub.unsubscribe(userId);
      })
    })      

      // webhook.on(WebhookEvent.MESSAGE_RECEIVED, message => {
      //   resolve(message);
      // });
    })
  
// Intent SIGN_IN is used when I call the even named SIGN_In in the previous intent, when I dont have users ID
// Account linking asks the user permission to use his data and returns a SIGN_IN Intent
// If he answered YES to SIGN_IN REquest I have Signin.status = OK

  assistant.intent('SIGN_IN',(conv, params, signin) => {
    logger.info('Received the return and will verify Userid');

//If Status is OK then he gave permission to get his data
    if (signin.status === 'OK') {
      userlocale = conv.user.locale;
      logger.info('Account Linking went ok and his locale is: ', userlocale);
      userpayload = conv.user.profile.payload;
      logger.info('This is the users given_name: ', JSON.stringify(conv.user.profile.payload.given_name));
      userId = userpayload.sub;
      logger.info('This is users userId: ', userId);
      userName = userpayload.given_name;
//     If locale is portuguese from  Brasil, say 'Hi, username, What Can I do for you?'
      if (userlocale === 'pt-BR') {
        conv.ask('Olá ' + userName + ', o que posso fazer por vc ?');
      }
//     If locale is Spanish, say 'Hi, username, What Can I do for you?'
      else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
        conv.ask('Hola ' + userName + ', que puedo hacer para ayudar?');
      }
    } else {
//If Status is NOT OK then he didnt give permission to get his data
      userlocale = conv.user.locale;
      userId = 'anonymus';
      if (userlocale === 'pt-BR') {
        conv.ask('Olá, como vc não forneceu seus dados, vou ter que pedir durante o processo algumas informações');
      }
      else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
        conv.ask('Hola, como no diste tus datos, voy a tener que pedir el proceso algunas informaciones');
      }
      else if ((userlocale === 'en-US') || (userlocale === 'en-GB')) {
        conv.ask('Hi, as you did not let me access your details, during the process I will have to ask for some information');
      }
    }
 
   
  }); // treatuser

  assistant.intent('Cancel', (conv) => {
    userlocale = conv.user.locale;
    userpayload = conv.user.profile.payload;
    userId = userpayload.sub;
    userName = userpayload.given_name;
// set initial channel to portuguese CHATBOT	
    var channeloc= {
      url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/291868e7-1eeb-490d-9fe5-c84362f34492',
      secret: 'BpZMnlY64tzVoBZHRtcgNvvs90ZE8lN6',
    };
// if portuguese - set channel to portuguese CHATBOT	
    if (userlocale === 'pt-BR') {
      channeloc= {
        url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/291868e7-1eeb-490d-9fe5-c84362f34492',
        secret: 'BpZMnlY64tzVoBZHRtcgNvvs90ZE8lN6',
      };
      logger.info('Channel being used: ', channeloc);
    }
// if Spanish - set channel to Spanish CHATBOT	
    else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
      channeloc = {
        url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/39b5e36b-dbdc-49f6-923a-ec8fc3b565b6',
        secret: 'CIhEYKrRu26ftxRysC1C3d0rn8sT2odo',
      };
      logger.info('Channel being used: ', channeloc);
    }  
    return new Promise(function (resolve, reject) {
      const MessageModel = webhook.MessageModel();

      var additionalProperties = {
        profile: {
          clientType: "google",
          locale: userlocale			
        }
      };
      var messagePayload = MessageModel.textConversationMessage('cancel');
      const message = _.assign({ userId, messagePayload }, additionalProperties);
      var treatandsendtoGoogle =  function (msg, data) {
      var texto1 = '';
      var texto2 = '';
      texto1 = data.body.messagePayload.text;
          
// usually my messages sent from Chatbot have a text and some actions (options I give to the user)
      if (data.body.messagePayload.actions){
          texto2 = actionsToText(data.body.messagePayload.actions,texto1);
          texto1 = '';
      }
        PubSub.unsubscribe(userId);
        conv.close('<speak>'+texto1+texto2+'</speak>');
        resolve();
      };		
 	  
	    PubSub.subscribe(userId, treatandsendtoGoogle)	  
      webhook.send(message, channeloc)
      .catch(err => {
        logger.info('Failed sending message to Bot');
        conv.ask('Failed sending message to Bot.  Please review your bot configuration.');
        reject(err);
        PubSub.unsubscribe(userId);
      })
    });      

      // webhook.on(WebhookEvent.MESSAGE_RECEIVED, message => {
      //   resolve(message);
      // });
    })
 
// These are functions from OracleBot to convert message
  function trailingPeriod(text) {
    if (!text || (typeof text !== 'string')) {
      return '';
    }
    return ((text.trim().endsWith('.') || text.trim().endsWith('?') || text.trim().endsWith(',')) ? text.trim() + ' ' : text.trim() + '. ');
  }
  
  function actionToText(action, actionPrefix) {
    var actionText = (actionPrefix ? actionPrefix + ' ' : '');
    if (action.label) {
      return actionText + action.label;
    }
    else {
      switch (action.type) {
      case 'postback':
        break;
      case 'call':
        if (userlocale === 'pt-BR') {
          actionText += 'Chame o fone de numero ' + action.phoneNumber;
        }
        else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
          actionText += 'Llame el telefono con numero ' + action.phoneNumber;
        }
        else if ((userlocale === 'en-US') || (userlocale === 'en-GB')) {
          actionText += 'Call the telephone with number ' + action.phoneNumber;
        }
        break;
      case 'url':
        if (userlocale === 'pt-BR') {
          actionText += 'Abra a URL ' + action.url;
        }
        else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
          actionText += 'Abra el sitio URL ' + action.url;
        }
        else if ((userlocale === 'en-US') || (userlocale === 'en-GB')) {
          actionText += 'Open the URL ' + action.url;
        }
        break;
      case 'share':
        if (userlocale === 'pt-BR') {
          actionText += 'Compartilhe a mensagem ';
        }
        else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
          actionText += 'Compartille el mensaje ';
        }  
        else if ((userlocale === 'en-US') || (userlocale === 'en-GB')) {
          actionText += 'Share the Message ';
        }              
        break;
      case 'location':
        if (userlocale === 'pt-BR') {
          actionText += 'Compartilhe a localização ';
        }
        else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
          actionText += 'Compartille la ubicación ';
        }  
        else if ((userlocale === 'en-US') || (userlocale === 'en-GB')) {
          actionText += 'Share the location ';        
        }              
        break;
      default:
        break;
      }
    }
    return actionText;
  }
  
  function actionsToText(actions, prompt, actionPrefix) {
    if (userlocale === 'pt-BR') {
      var actionsText = prompt || 'Voce pode escolher das seguintes ações: ';
    }
    else if ((userlocale === 'es-ES') || (userlocale === 'es-419')) {
      var actionsText = prompt || 'Tu puedes escojer de las seguientes opciones: ';
    }
    else if ((userlocale === 'en-US') || (userlocale === 'en-GB')) {
      var actionsText = prompt || 'You can choose from the following actions: ';
    }
    actions.forEach(function (action, index) {
      actionsText = actionsText + actionToText(action, actionPrefix);
      if (index < actions.length - 1) {
        actionsText = actionsText + ', ';
      }
    });
    return trailingPeriod(actionsText);
  }
  

  app.use('/fulfillment',bodyParser.json(),assistant);
 
  app.post('/fulfillment', assistant );
}

// can remove body-parser
