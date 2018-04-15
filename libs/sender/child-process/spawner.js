const { spawn } = require('child_process');
const InputReader = require('../messages/input-reader');



function setupMessageProcessors(cp, onError, onMessage){
   // *Dispatching the error stream to the given callback:
   cp.on('error', err => {
      if(typeof onError === 'function')
         onError(err);
   });

   // *Initializing the unit that will process the received chunks to dispatch the messages:
   const input_reader = new InputReader(onMessage);

   // *Dispatching the received messages:
   cp.stdout.on('data', input_buffer => {
      input_reader.read(input_buffer);
   });

   // cp.on('close', code => {});
}



function spawn(command_name, args, onError, onMessage){
   // *Spawning the sub-process with the given command:
   const cp = spawn(command_name, args, {
      stdio: [ 'pipe', 'pipe', 'pipe' ]
   });

   // *Setting up the messages processors in the spawned sub-process:
   setupMessageProcessors(cp, onError, onMessage);

   // *Returning the spawned sub-process:
   return cp;
}



module.exports = {
   spawn
};
