module.exports = class InputReader {
   constructor(message_delimiter, onCompleteMessage) {
      this._received_inputs = [];
      this.onCompleteMessage = onCompleteMessage;

      this._before_delimiter_regex = new RegExp('([\\s\\S]*)\\n' + message_delimiter, 'g');
      this._after_delimiter_regex = new RegExp('\\n' + message_delimiter + '([\\s\\S]+)$');

   }

   /**
    * [read description]
    * @param  {Buffer|String} chunk [description]
    * @return {[type]}       [description]
    */
   read(chunk){

      // *Converting the received data into an UTF-8 string, if it's a buffer:
      const input = (Buffer.isBuffer(chunk))
         ? chunk.toString('utf8')
         : chunk;

      // *Trying to find a delimiter in the received input:
      let delimiter_match = this._before_delimiter_regex.exec(input);

      // *Checking if a message delimiter could be found, meaning that a new message is complete:
      if(delimiter_match){
         // *If at least one delimiter could be found:

         // *Dispatching messages while there are more delimiters in the given input:
         while(delimiter_match){

            // *Adding the received message part into the chunks list:
            this._received_inputs.push(delimiter_match[1]);

            // *Getting the complete message by concatenating all the received chunks since the last message:
            const complete_message = this._received_inputs.join('');

            // *Cleaning the message chunks recipient:
            this._received_inputs = [];

            // *Dispatching the received message (the entire message):
            if(typeof this.onCompleteMessage === 'function')
               this.onCompleteMessage(complete_message);

            // *Trying to find another delimiters in the received input:
            delimiter_match = this._before_delimiter_regex.exec(input);
         }

         // *Setting that the 'remainder message regex' should start from where the 'delimiter regex' have ended:
         this._after_delimiter_regex.lastIndex = this._before_delimiter_regex.lastIndex;


         const remaining_message_match = this._after_delimiter_regex.exec(input);
         if(remaining_message_match)
            this._received_inputs.push(remaining_message_match[1]);


         // *Resetting the regex:
         this._before_delimiter_regex.lastIndex = 0;
         this._after_delimiter_regex.lastIndex = 0;
      } else{
         // *If a delimiter could not be found, meaning that the stream is receiving the message in chunks:
         // *Adding the received chunk in the chunks recipient:
         this._received_inputs.push(input);
      }
   }
}
