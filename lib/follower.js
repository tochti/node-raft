/* jshint node:true */
'use strict';
var misc = require('./misc.js');

var follower = {

  timeoutObj: undefined,
  leader: undefined,

  // Start everything what a follower needs. 
  //
  // Arguments,
  //   nodeSpecs NodeSpecs object
  //   switchState Function to switch state
  // Returns nothing
  //
  start: function(nodeSpecs, switchState) {
    this.timeoutObj = this.startWatcher(switchState);
  },

  heartbeat: function(nodeSpecs, switchState, req, res, next) {

    if (this.leader === undefined) {
      var remoteHost = misc.readHost(req);
      var node = misc.findNodeByHost(nodeSpecs.nodes, remoteHost.host);
      if (node === null) {
        return next();
      }

      this.leader = node;
    }

    if (this.leader.host !== req.hostname) {
      return next();
    }

    this.timeoutObj = this.resetWatcher(this.timeoutObj, switchState);
    res.send(200);
    res.end();
    return next();
  },

  vote: function(nodeSpecs, switchState, req, res, next) {
    var remoteHost = misc.readHost(req);
    var node = misc.findNodeByHost(nodeSpecs.nodes, remoteHost.host);
    if (node === null) {
      return next();
    }

    res.send(200);
    res.end();
    return next();
  },

  stop: function(nodeSpecs, switchState) {
    clearTimeout(this.timeoutObj);
  },

  startWatcher: function(switchState) {
    return setTimeout(function() {
      switchState('candidate');
    }, misc.randPeriod(250, 500));
  },

  resetWatcher: function(timeoutObj, switchState) {
    clearTimeout(timeoutObj);
    return this.startWatcher(switchState);
  },

};

module.exports = {
  Follower: function() {
    return Object.create(follower);
  }
};
