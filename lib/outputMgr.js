/* Copyright (c) 2017-present, salesforce.com, inc. All rights reserved */
/* Licensed under BSD 3-Clause - see LICENSE.txt or git.io/sfdc-license */

/**
 * Defines the OutputMgr class that helps the ConversationEngine build an output
 * as provided by Violet Scripts
 *
 * @module outputMgr
 */
var utils = require('./utils.js');
var ScriptParser = require('./scriptParser.js');

const pauseStr = ' <break time="500ms"/> ';


var _pickAndInterpolate = function(potResponses, interpolationStore) {
  var str = potResponses;
  if (Array.isArray(potResponses)) {
    str = potResponses[utils.getRand(0, potResponses.length)];
  }
  if (interpolationStore) { // unlikely, but in error situations interpolationStore can be null
    str = ScriptParser.interpolateParamsFromStore(str, ScriptParser.paramsRE, interpolationStore);
  }
  if (!str) console.log(new Error().stack);
  console.log('picking for output: ' + str);
  return str;
}


/**
 * Helps the ConversationEngine build an output (back to Alexa) as provided by
 * calls from Violet Scripts to the Response class
 * <br><br>
 * Methods in this class are currently only used internally and therefore
 * documentation is not exposed.
 *
 * @class
 */
class OutputMgr {
  constructor() {
    // script configuration
    this.spokenRate = null;

    // state while outputing - can span multiple Response's (when multiple goals are being met)
    this.asked = 0;      // can be less than one for partial questions, i.e. prompts
    this.sayQueue = [];
    this.askQueue = [];

    this.keepConversationRunning = true;

    this.__speaking = false;
  }
  initialize() {
    this.asked = 0;

    this.sayQueue = [];
    this.askQueue = [];

    this.keepConversationRunning = true;
  }


  setSpeaking() { this.__speaking = true; }
  clearSpeaking() { this.__speaking = false; }
  isSpeaking() { return this.__speaking; }

  say(response, potResponses, quick) {
    if (this.sayQueue.length>0 && !quick) this.sayQueue.push(pauseStr);
    this.sayQueue.push(_pickAndInterpolate(potResponses, response._sessionStore()));
  }
  prompt(response, potResponses) {
    this.askQueue.push(_pickAndInterpolate(potResponses, response._sessionStore()));
    this.asked += 0.34;
  }
  ask(response, potResponses) {
    this.askQueue.push(_pickAndInterpolate(potResponses, response._sessionStore()));
    this.asked += 1;
  }
  sendFromQueue(platReq, response, potResponses) {
    if (potResponses) this.sayQueue.push(_pickAndInterpolate(potResponses, response._sessionStore()));
    // build outBuffer
    var outBuffer = '';
    this.sayQueue.forEach(str=>{
      if (outBuffer.length == 0)
        outBuffer = str;
      else
        outBuffer += ' ' + str;
    });
    this.askQueue.forEach((str, ndx)=>{
      if (outBuffer.length == 0) {
        outBuffer = str;
        return;
      }
      if (ndx==0)
        outBuffer += pauseStr + str;
      else if (ndx==this.askQueue.length-1)
        outBuffer += ' or ' + str;
      else
        outBuffer += ', ' + str;
    });

    if (this.spokenRate) outBuffer = `<prosody rate="${this.spokenRate}">${outBuffer}</prosody>`;
    outBuffer = outBuffer.replace(/\s&\s/g, ' and ');

    if (outBuffer !== '') {
      console.log('Saying: ' + outBuffer);
      platReq.say(outBuffer);
    }
    if (this.keepConversationRunning) platReq.shouldEndSession(false);
    return outBuffer;
  }
  /*DANGER - will likely remove these soon - only used by ClientTx plugin - DANGER*/
  __get_sendFromQueue() {return this.sendFromQueue;}
  __set_sendFromQueue(val) {this.sendFromQueue = val;}

}


module.exports = OutputMgr;