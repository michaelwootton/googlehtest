const OracleBot = require('@oracle/bots-node-sdk');
const { WebhookClient, WebhookEvent } = OracleBot.Middleware;
const bodyParser = require('body-parser');
const _ = require('underscore');
const JSON = require('circular-json');
// google
const PubSub = require('pubsub-js');
PubSub.immediateExceptions = true;
const { dialogflow, SignIn } = require('actions-on-google');
const assistant = dialogflow({debug: true, clientId:'4819215140-h19dtif7hddobc9moak4g5jgdumu7kce.apps.googleusercontent.com',});
var userlocale = '';
var userId = '';

module.exports = (app) => {
  const logger = console;
  // this will add body-parser
  OracleBot.init(app, {
    logger,
  });
  
  // Use this if you only have one Chatbot being called
  //const webhook = new WebhookClient({
  //  channel: {
  //    url: 'http://youraddreas.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  //    secret: 'BpZMnlY64tzVoBZHRtcgNvvs90ZE8lN6',
  //  }
  //});
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
           url= 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/9638f435-ba7b-4d30-867c-81fa2d61fd94';
           secret= 'rPTELmhGUwJRVHkFB6FB3WDKz1PhQL0S';
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
 
  // Need pub/sub storage

  // https://my.ngrok.io/bot/message/es <=== configured this in ODA per channel/locale
  // https://my.ngrok.io/bot/message/pt <=== configured this in ODA per channel/locale
  app.post('/bot/message/:locale', webhook.receiver((req, res) => {
    const { locale } = req.params;
    res.sendStatus(200);
     const body = req.body;
     const userId = body.userId;
     logger.info("Publishing to", userId);
     PubSub.publish(userId, req);
    
  }));
  assistant.intent('Default Welcome Intent', (conv) => {
    
    userlocale = conv.user.locale;

    logger.info('Welcome user profile payload: ', JSON.stringify(conv.user.profile));
    if (typeof conv.user.profile.payload === 'undefined') {
    // If given_name is blank means that it is a new user, so will start a SIGN_IN process in Google to get users details	
      logger.info('Starting Signin proccess');
      if ((userlocale.substring(0,2) === 'pt') && (typeof conv.user.storage.userId === 'undefined')) {
         userId = self.randomIntInc(1000000, 9999999).toString();
    //     If locale is portuguese, start sign-in informing the reason
    //     Message means - To get you Google account details, like name and email, answer YES (Sim)
         conv.ask(new SignIn('Para pegar os detalhes da sua conta do Google, como nome e email, responda Sim'));
      }
      else if ((userlocale.substring(0,2) === 'es') && (typeof conv.user.storage.userId === 'undefined')){
         userId = self.randomIntInc(1000000, 9999999).toString();
    //     If locale is Spanish, start sign-in informing the reason
    //     Message means - To get you Google account details, like name and email, answer YES (Sim)
         conv.ask(new SignIn('Para tenermos los detalles de su cuenta de Google, como nombre y email, conteste Sí'));
      }  
      else if ((userlocale.substring(0,2) === 'en') && (typeof conv.user.storage.userId === 'undefined')){
        userId = self.randomIntInc(1000000, 9999999).toString();
   //     If locale is English, start sign-in informing the reason
   //     Message means - To get you Google account details, like name and email, answer YES (Sim)
        conv.ask(new SignIn('To get you Google account details, like name and email, answer YES'));
     }  
     logger.info('Got out of Signin');
    } else { 
        if (userlocale.substring(0,2) === 'pt') {
          conv.ask('Oiii');
        }
        else if (userlocale.substring(0,2) === 'es') {
          conv.ask('Hola');
        }  
        else if (userlocale.substring(0,2) === 'en') {
          conv.ask('Hi');
        }  
    }
  });

  assistant.intent('Default Fallback Intent', (conv) => {
    
    logger.info('Got query : ', conv.query);

//as the Chatbot has only resource Bundles for es-Es (Spain) or es-419 (Mexico), transform to es-419
  
    userlocale = conv.user.locale;

    if (userlocale.substring(0,2) === 'es') {userlocale = 'es-419'};

    logger.info('user profile payload: ', JSON.stringify(conv.user.profile));
    if (typeof conv.user.profile.payload === 'undefined') {
       userId = conv.user.storage.userId; 
       userName = '';
    } else {
      userpayload = conv.user.profile.payload;
      userId = userpayload.sub;
      logger.info('I am in default Fallback - This is users User ID: ', userId);
      userName = userpayload.given_name;
    }   

// set initial channel to portuguese CHATBOT	
// if locale qual English will use the Portuguese CHATBOT, this chatbot can treat English also.	
    var channeloc= {
      url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/9638f435-ba7b-4d30-867c-81fa2d61fd94',
      secret: 'rPTELmhGUwJRVHkFB6FB3WDKz1PhQL0S',
    };
// if portuguese - set channel to portuguese CHATBOT	
    if (userlocale.substring(0,2) === 'pt') {
      channeloc= {
        url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/9638f435-ba7b-4d30-867c-81fa2d61fd94',
        secret: 'rPTELmhGUwJRVHkFB6FB3WDKz1PhQL0S',
      };
    }
// if Spanish - set channel to Spanish CHATBOT	
    else if (userlocale.substring(0,2) === 'es')  {
      channeloc = {
        url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/39b5e36b-dbdc-49f6-923a-ec8fc3b565b6',
        secret: 'CIhEYKrRu26ftxRysC1C3d0rn8sT2odo',
      };
    }  
    logger.info('Channel being used: ', channeloc);

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
      
      var treatandsendtoGoogle =  function (msg, data) {
        conv.user.storage.userId = userId;
        var texto1 = '';
        var texto2 = '';
        texto1 = data.body.messagePayload.text;
 // usually my messages sent from Chatbot have a text and some actions (options I give to the user)
        if (data.body.messagePayload.actions){
            texto2 = actionsToText(data.body.messagePayload.actions,texto1);
            texto1 = '';
        }
        logger.info('text 2 ', JSON.stringify(texto2));
        PubSub.unsubscribe(userId);
        if (typeof data.body.messagePayload.channelExtensions === 'undefined') {
          conv.ask('<speak>'+texto1+texto2+'</speak>');
        }
        else {
          conv.close('<speak>'+texto1+texto2+'</speak>');
        }
        resolve();
      };		
 	  
	    PubSub.subscribe(userId, treatandsendtoGoogle)	  
      webhook.send(message, channeloc)
      .catch(err => {
        logger.info('Failed sending message to Bot');
        if (userlocale.substring(0,2) === 'pt') {
            conv.ask('Houve falha no envio da mensagem ao Chatbot. Por favor, revise a configuração do seu Chatbot.');
        }
    // if Spanish - send message of error in Spanish
        else if (userlocale.substring(0,2) === 'es')  {
            conv.ask('Tuvimos un error en el envio del mensaje al Chatbot. Por favor, revise la configuración de su Chatbot.');
        }
        else {
            conv.ask('Failed sending message to Bot.  Please review your bot configuration.');
        }
        reject(err);
        PubSub.unsubscribe(userId);
      })
    })      
  })
  
// Intent SIGN_IN is used when I call the Account Linking proccess in "Default Welcome Intent", when I dont have users ID
// Account linking asks the user permission to use his data and returns a SIGN_IN Intent
// If he answered YES to SIGN_IN REquest I have Signin.status = OK

  assistant.intent('SIGN_IN',(conv, params, signin) => {
    logger.info('Received the return and will verify Userid');

//If Status is OK then he gave permission to get his data
    if (signin.status === 'OK') {
      userlocale = conv.user.locale;
      userpayload = conv.user.profile.payload;
      userId = userpayload.sub;
      logger.info('This is users userId: ', userId);
      userName = userpayload.given_name;
//     If locale is portuguese from  Brasil, say 'Hi, username, What Can I do for you?'
      if (userlocale.substring(0,2) === 'pt') {
        conv.ask('Olá ' + userName + ', o que posso fazer por vc ?');
      }
//     If locale is Spanish, say 'Hi, username, What Can I do for you?'
      else if (userlocale.substring(0,2) === 'es') {
        conv.ask('Hola ' + userName + ', que puedo hacer para ayudar?');
      }
      else if (userlocale.substring(0,2) === 'en') {
        conv.ask('Hi ' + userName + ', what Can I do for you?');
      }
    } else {
//If Status is NOT OK then he didnt give permission to get his data
      userlocale = conv.user.locale;
            
      if (userlocale.substring(0,2) === 'pt') {
        conv.ask('Olá, como voce não forneceu seus dados, vou ter que pedir durante o processo algumas informações. O que posso fazer por voce ?');
      }
      else if (userlocale.substring(0,2) === 'es') {
        conv.ask('Hola, como no diste tus datos, voy a tener que pedir el proceso algunas informaciones, que puedo hacer para ayudar?');
      }
      else if (userlocale.substring(0,2) === 'en') {
        conv.ask('Hi, as you did not let me access your details, during the process I will have to ask for some information, what can I do for you?');
      }
    }
 
   
  }); // treatuser

  assistant.intent('Cancel', (conv) => {
    userlocale = conv.user.locale;
    logger.info('user profile payload: ', JSON.stringify(conv.user.profile));

    if (typeof conv.user.profile.payload === 'undefined') {
       userId = conv.user.storage.userId; 
       userName = '';
    } else {
      userpayload = conv.user.profile.payload;
      userId = userpayload.sub;
      userName = userpayload.given_name;
    }   
    logger.info('I am in Cancel Intent - This is users User ID: ', userId);
    // set initial channel to portuguese CHATBOT	
    var channeloc= {
      url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/9638f435-ba7b-4d30-867c-81fa2d61fd94',
      secret: 'rPTELmhGUwJRVHkFB6FB3WDKz1PhQL0S',
    };
// if portuguese - set channel to portuguese CHATBOT	
    if (userlocale.substring(0,2) === 'pt') {
      channeloc= {
        url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/9638f435-ba7b-4d30-867c-81fa2d61fd94',
        secret: 'rPTELmhGUwJRVHkFB6FB3WDKz1PhQL0S',
      };
     }
// if Spanish - set channel to Spanish CHATBOT	
    else if (userlocale.substring(0,2) === 'es') {
      channeloc = {
        url: 'http://2b2d3e3d.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/39b5e36b-dbdc-49f6-923a-ec8fc3b565b6',
        secret: 'CIhEYKrRu26ftxRysC1C3d0rn8sT2odo',
      };
    }  
    logger.info('Channel being used: ', channeloc);
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
        if (userlocale.substring(0,2) === 'pt') {
          actionText += 'Chame o fone de numero ' + action.phoneNumber;
        }
        else if (userlocale.substring(0,2) === 'es') {
          actionText += 'Llame el telefono con numero ' + action.phoneNumber;
        }
        else if (userlocale.substring(0,2) === 'en')  {
          actionText += 'Call the telephone with number ' + action.phoneNumber;
        }
        break;
      case 'url':
        if (userlocale.substring(0,2) === 'pt-BR') {
          actionText += 'Abra a URL ' + action.url;
        }
        else if (userlocale.substring(0,2) === 'es-ES')  {
          actionText += 'Abra el sitio URL ' + action.url;
        }
        else if (userlocale.substring(0,2) === 'en-US')  {
          actionText += 'Open the URL ' + action.url;
        }
        break;
      case 'share':
        if (userlocale.substring(0,2) === 'pt') {
          actionText += 'Compartilhe a mensagem ';
        }
        else if (userlocale.substring(0,2) === 'es') {
          actionText += 'Compartille el mensaje ';
        }  
        else if (userlocale.substring(0,2) === 'en') {
          actionText += 'Share the Message ';
        }              
        break;
      case 'location':
        if (userlocale.substring(0,2) === 'pt') {
          actionText += 'Compartilhe a localização ';
        }
        else if (userlocale.substring(0,2) === 'es')  {
          actionText += 'Compartille la ubicación ';
        }  
        else if (userlocale.substring(0,2) === 'en')  {
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
    if (userlocale.substring(0,2) === 'pt') {
      var actionsText = prompt || 'Voce pode escolher das seguintes ações: ';
    }
    else if (userlocale.substring(0,2) === 'es')  {
      var actionsText = prompt || 'Tu puedes escojer de las seguientes opciones: ';
    }
    else if (userlocale.substring(0,2) === 'en')  {
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
