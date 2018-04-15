const uuid = require('uuid');
const IPCChildProcess = require('../ipc-child-process');
const OutgoingMessage = require('../../types/outgoing-message');



module.exports = class IPCMaster{
   constructor(command_name, args){
      this._child = new IPCChildProcess(command_name, args);
   }

   start(){
      this._child.on('error', err => {
         console.error(err);
      });

      return this._child.start();
   }

   stop(){
      return this._child.stop();
   }

   async send(requestBuilder){

      if(!this._child.started())
         await this._child.start();

      const message_id = uuid.v4();

      const req = new OutgoingMessage(message_id);

      if(typeof requestBuilder === 'function')
         requestBuilder(req);

      return await new Promise((resolve, reject) => {
         const onMessage = message => {
            if(message.id === message_id){
               this._child.removeListener('message', onMessage);
               resolve(message);
            }
         };

         this._child.on('message', onMessage);

         this._child.send(req);
      });
   }
};
