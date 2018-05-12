module.exports = class IncomingMessage{

   constructor(){
      this.id = null;
      this.query = null;
      this.error = null;
      this.data = null;
   }


   static from(obj){
      if(typeof obj !== 'object' || !obj)
         throw new TypeError();

      const msg = new IncomingMessage();
      msg.id = obj.id;
      msg.query = obj.query;
      msg.error = obj.error;
      msg.data = obj.data;
   }


   /**
    * Sets a query parameter value
    * @param  {String} key   The name of the parameter
    * @param  {*} value      The new value for the parameter
    */
   setQuery(key, value){
      if(!typeof key === 'string')
         throw new Error(`The "key" must be a string`);

      key = key.trim();

      if(!key.length)
         throw new Error(`The "key" cannot be an empty string`);

      // *Creating the query parameters map, if it doesn't exist yet:
      if(!this.query)
         this.query = {};

      // *Assigning the value for the parameter:
      this.query[key] = value;
   }


   getQuery(key){
      return (!this.query)
         ? undefined
         : this.query[key];
   }


   error(err){
      this.error = err;
   }


   text(content){
      this.data = content;
   }


   json(obj){
      if(typeof obj !== 'object')
         throw new Error(`The "obj" must be an object`);

      const data = (obj === null)
         ? null
         : JSON.stringify(obj);

      this.text(data);
   }

}
