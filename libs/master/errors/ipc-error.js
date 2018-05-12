module.exports = class IPCError extends Error {
   constructor(code, message, cause){
      super(message);
      this.code = code;
      this.cause = cause;
   }
};
