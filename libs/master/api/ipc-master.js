// *Requesting the needed modules:
const uuid = require('uuid');
const IPCChildProcess = require('../ipc-child-process');
const OutgoingMessage = require('../../types/outgoing-message');



/**
 * The master side of the IPC bridge
 * This is the entity responsible to start and manage a new worker sub-process
 * with which it'll stablish a communication line (also called IPC bridge)
 * using their STDIO channels to exchange messages between them.
 * @class
 */
module.exports = class IPCMaster{

   /**
    * Creates the manager of a sub-process, with which it'll exchange messages.
    * Each master instance is responsible for only one worker sub-process.
    * Note that the provided command must start a process that implements this
    * same protocol, in order for the IPC bridge to work properly.
    * @constructor
    * @param {String} command_name The main command to spawn the sub-process
    * @param {String[]} [args]     The aditional arguments for the mais command
    */
   constructor(command_name, args){
      // *Creating the unit that will handle the sub-process activities:
      this._child = new IPCChildProcess(command_name, args);
   }


   /**
    * Spawns and starts to manage the sub-process.
    * If the sub-process have already been started, this method has no effect.
    * @return {Promise} Resolves when the sub-process gets ready to listen for
    *                   requests
    */
   async start(){
      // *Exiting this method if the worker already got started:
      if(this._child.started())
         return;

      // *Registering a listener for errors:
      this._child.on('error', err => {
         console.error(err);
      });

      // *Returning the sub-process start promise:
      return this._child.start();
   }


   /**
    * Kills the sub-process.
    * If the sub-process is already stopped, this method has no effect.
    * @return {Promise} Resolves when the sub-process gets killed
    */
   async stop(){
      // *Exiting this method if the worker is already stopped:
      if(!this._child.started())
         return;

      // *Returning the stopping promise:
      return await this._child.stop();
   }


   /**
    * Sends a new message to the worker sub-process.
    * The sub-process will be started if it isn't already.
    * @param  {Function} requestBuilder The function that will receive the
    *                                   request object and change it to be sent
    *                                   to the worker.
    * @return {Promise}                 Resolves into the received response
    */
   async send(requestBuilder){
      // *Starting the sub-process if it's not already started
      if(!this._child.started())
         await this._child.start();

      // *Generating a pseudo-random message identifier:
      const message_id = uuid.v4();

      // *Initializing the request object:
      const req = new OutgoingMessage(message_id);

      // *Executing the request decoration function, if it have been provided:
      if(typeof requestBuilder === 'function')
         requestBuilder(req);

      return await new Promise((resolve, reject) => {

         /**
          * Resolves the promise once this request's response is received
          * @param  {IncomingMessage} res The received response message
          */
         const onMessage = res => {
            // *Checking if the received message id is the same of the request:
            if(res.id === req.id){
               // *If it is:
               // *Removing this listener, as it's not needed anymore:
               this._child.removeListener('message', onMessage);
               // *Resolving the outter promise with the response message:
               resolve(res);
            }
         };

         // *Starting to handle the received messages from the worker process:
         this._child.on('message', onMessage);

         // * Sending the message to the worker:
         this._child.send(req);
      });
   }
};
