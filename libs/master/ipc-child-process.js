const EventEmitter = require('events');
const { spawn } = require('child_process');

const InputReader = require('./messages/input-reader');

const PROCESS_ALIVE = '#proc-alive';
const MESSAGE_DELIMITER = '#msg-end';

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

         // *Handling when the sub-process got received a kill signal, or have finished by its own:
         if(typeof onFinish === 'function')
            cp.on('exit', (code, signal) => onFinish(code, signal));

         // *Handling the first received data from the sub-process:
         cp.stdout.once('data', data => {
            // *Checking if the first data sent is the 'alive' signal:
            if(data.toString('utf-8').includes(PROCESS_ALIVE)){
               // *If it is:

               // *Handling the error stream, only if the error callback is valid:
               if(typeof onError === 'function')
                  // *Piping the error stream to the error callback:
                  cp.on('error', err => onError(err));

               // *Handling the message stream, if the message callback is valid:
               if(typeof onMessage === 'function'){
                  // *Initializing the unit that will process the received chunks to dispatch the complete messages:
                  const reader = new InputReader(MESSAGE_DELIMITER, onMessage);
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
               reject(new Error(`Child process could be started, but not sent an 'alive' signal`));
            }
         });
      });
   }



   started(){
      return this._cp;
   }


   async start(){
      if(this.started()) return;

      this._cp = await this._spawnProcess(
            (err) => this._onReceiveError(err),
            (message) => this._onReceive(message),
            (code, signal) => this._onFinish(code, signal));
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

      this._cp.stdin.write((JSON.stringify(message) + '\n' + MESSAGE_DELIMITER));
   }



   /**
    * [receive description]
    * @param  {String} message [description]
    * @return {[type]}         [description]
    */
   _onReceive(message){
      this.emit('message', JSON.parse(message));
   }

   /**
    * [receiveError description]
    * @param  {String} err [description]
    * @return {[type]}     [description]
    */
   _onReceiveError(err){
      this.emit('error', JSON.parse(err));
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
