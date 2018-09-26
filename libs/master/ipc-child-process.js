const EventEmitter = require('events');
const { spawn } = require('child_process');

const MESSAGE_CODES = require('../enums/message-codes');
const InputReader = require('./messages/input-reader');
const IncomingMessage = require('../types/incoming-message');
const IPCError = require('./errors/ipc-error');

module.exports = class IPCChildProcess extends EventEmitter {
   constructor(command_name, args){
      super();
      this._command_name = command_name;
      this._args = args;
      this._cp = null;
   }

   _killProcess(cp){
      cp.kill('SIGINT');
   }

   _spawnProcess(onError, onMessage, onFinish){
      return new Promise((resolve, reject) => {
         // *Spawning the sub-process with the given command:
         const cp = spawn(this._command_name, this._args, { stdio: 'pipe' });

         // *Handling when the STDIO channels of the sub-process get closed:
         cp.on('close', (code, signal) => {});

         // *Handling the error stream, only if the error callback is valid:
         if(typeof onError === 'function')
            // *Piping the error stream to the error callback:
            cp.on('error', err => onError(err));

         // *Handling the error stream, only if the error callback is valid:
         if(typeof onError === 'function')
            // *Piping the error stream to the error callback:
            cp.stderr.on('data', data => onError(new Error(data ? data.toString() : null)));

         // *Handling when the sub-process got received a kill signal, or have finished by its own:
         if(typeof onFinish === 'function')
            cp.on('exit', (code, signal) => onFinish(code, signal));

         // *Handling the first received data from the sub-process:
         cp.stdout.once('data', data => {
            // *Getting the first sent message from the spawned process:
            const message_received = data.toString('utf-8');

            // *Checking if the first data sent is the 'alive' signal:
            if(message_received.includes(MESSAGE_CODES.PROCESS_ALIVE)){
               // *If it is:
               // *Handling the message stream, if the message callback is valid:
               if(typeof onMessage === 'function'){
                  // *Initializing the unit that will process the received chunks to dispatch the complete messages:
                  const reader = new InputReader(MESSAGE_CODES.MESSAGE_DELIMITER, onMessage);
                  // *Dispatching the received messages:
                  cp.stdout.on('data', input => reader.read(input));
               }

               // *Returning the spawned sub-process:
               resolve(cp);
            } else{
               // *If it didn't send the 'alive' signal:
               // *Killing the sub-process:
               this._killProcess(cp);
               // *Rejecting as the sub-process may not be prepared for the IPC bridge:
               reject(new IPCError('ALIVE_SIGNAL', `Child process could be started, but it didn't send the 'alive' signal, instead it sent: "${message_received}"`));
            }
         });
      });
   }


   /**
    * Checks if the worker sub-process is started
    * This will also return true while the sub-process is being started
    * @return {Boolean} Whether the sub-process is started or not
    */
   started(){
      return !!this._cp;
   }


   start(){
      // *Returning if it have already been started:
      if(this.started()) return Promise.resolve();

      // *Starting and configuring the sub-process:
      return this._spawnProcess(
            (err) => this._onReceiveError(err),
            (message) => this._onReceive(message),
            (code, signal) => this._onFinish(code, signal))

            // *Assigning the child-process:
            .then(cp => this._cp = cp);
   }


   stop(){
      return new Promise((resolve, reject) => {
         if(!this.started()) return;

         this.once('finish', resolve);

         this._killProcess(this._cp);
      });
   }


   /**
    * Sends a message to the sub-process
    * @param {OutgoingMessage} message The message object to be sent
    */
   send(message){
      if(!this.started())
         throw new Error(`Can't send message "${message.id()}": The sub-process haven't yet been started`);

      this._cp.stdin.write((JSON.stringify(message) + '\n' + MESSAGE_CODES.MESSAGE_DELIMITER));
   }



   /**
    * Handles incoming messages from the sub-process
    * Emits 'message' event with the received IncomingMessage response
    * @param {String} message The received message
    */
   _onReceive(message){
      const parsed = JSON.parse(message);
      const incomming_message = IncomingMessage.from(parsed);
      this.emit('message', parsed);
   }

   /**
    * [receiveError description]
    * @param  {String} err [description]
    * @return {[type]}     [description]
    */
   _onReceiveError(err){
      this.emit('error', err);
   }

   /**
    * [finished description]
    * @param  {Number} code   [description]
    * @param  {String} signal [description]
    * @return {[type]}        [description]
    */
   _onFinish(code, signal){
      this._cp = null;
      this.emit('finish');
   }
};
