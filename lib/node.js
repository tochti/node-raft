/* jshint node:true */
'use strict';

function MissingFieldError(f) {
  this.name = 'MissingFieldError';
  this.message = 'Missing field ' + f;
}
MissingFieldError.prototype = Error.prototype;

function validRemoteNode(data) {
  var fields = ['name', 'host', 'port'];
  fields.forEach(function(f) {
    if (data[f] === undefined) {
      throw new MissingFieldError(f);
    }
  });
}

function RemoteNode(data) {
  validRemoteNode(data);

  return Object.create(
    Object,
    {
      name: {
        get: function() {
          return data.name;
        }
      },
      host: {
        get: function() {
          return data.host;
        }
      },
      port: {
        get: function() {
          return data.port;
        }
      },
    }
  );

}

module.exports = {
  RemoteNode: RemoteNode,
  MissingFieldError: MissingFieldError,
};
