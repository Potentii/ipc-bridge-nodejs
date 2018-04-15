const MESSAGE_DELIMITER = '#msg-end';
const MESSAGE_BEFORE_DELIMITER_REGEX = new RegExp('([\\s\\S]*)\\n' + MESSAGE_DELIMITER, 'g');
const MESSAGE_AFTER_DELIMITER_REGEX = new RegExp('\\n' + MESSAGE_DELIMITER + '([\\s\\S]+)$');


module.exports = class InputReader {
   constructor(onCompleteMessage) {
      this._received_inputs = [];
      this.onCompleteMessage = onCompleteMessage;
   }

   /**
    * [read description]
    * @param  {Buffer|String} chunk [description]
    * @return {[type]}       [description]
    */
   read(chunk){

      // *Converting the received data into an UTF-8 string, if it's a buffer:
      const input = (Buffer.isBuffer(chunk))
         ? input_buffer.toString('utf8')
         : chunk;

      // *Trying to find a delimiter in the received input:
      let delimiter_match = MESSAGE_BEFORE_DELIMITER_REGEX.exec(input);

      // *Checking if a message delimiter could be found, meaning that a new message is complete:
      if(delimiter_match){
         // *If at least one delimiter could be found:

         // *Dispatching messages while there are more delimiters in the given input:
         while(delimiter_match){

            // *Adding the received message part into the chunks list:
            this._received_inputs.push(delimiter_match[1]);

            // *Getting the complete message by concatenating all the received chunks since the last message:
            const complete_message = this._received_inputs.join();

            // *Cleaning the message chunks recipient:
            this._received_inputs = [];

            // *Dispatching the received message (the entire message):
            if(typeof this.onCompleteMessage === 'function')
               this.onCompleteMessage(complete_message);

            // *Trying to find another delimiters in the received input:
            delimiter_match = MESSAGE_BEFORE_DELIMITER_REGEX.exec(input);
         }

         // *Setting that the 'remainder message regex' should start from where the 'delimiter regex' have ended:
         MESSAGE_AFTER_DELIMITER_REGEX.lastIndex = MESSAGE_BEFORE_DELIMITER_REGEX.lastIndex;


         const remaining_message_match = MESSAGE_AFTER_DELIMITER_REGEX.exec(input);
         if(remaining_message_match)
            this._received_inputs.push(remaining_message_match[1]);


         // *Resetting the regex:
         MESSAGE_BEFORE_DELIMITER_REGEX.lastIndex = 0;
         MESSAGE_AFTER_DELIMITER_REGEX.lastIndex = 0;
      } else{
         // *If a delimiter could not be found, meaning that the stream is receiving the message in chunks:
         // *Adding the received chunk in the chunks recipient:
         this._received_inputs.push(input);
      }
   }
}
