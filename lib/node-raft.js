/* jshint node:true */
'use strict';

var restify = require('restify');

var Node = function(host) {
  this.host = host;
  this.port = 1316;

  this.client = restify.createJsonClient({
    url: 'http://' + this.host + ':' + this.port,
  });

  this.sendHeartbeat = function() {
    var data = {
      name: NodeCtx.name,
      term: NodeCtx.term
    };
    this.client.put('/heartbeat', data, function() {});
  };

  this.sendHeartbeatAck = function() {
    var data = {
      name: NodeCtx.name,
      term: NodeCtx.term,
    };
    this.client.post('/', data, function() {});
  };

  this.sendVote = function() {
    var data = {
      name: NodeCtx.name,
      term: NodeCtx.term,
    };
    this.client.post('/vote', data, function() {});
  };

  this.sendVotesRequest = function() {
    this.client.get('/votes', function() {});
  };
};

var NodeCtx = {
  state: 'follower',
  name: '',
  term: 0,
  nodes: [],
};

var client = restify.createJsonClient();

var leaderTimeout = {
  timeoutObj: undefined,
  start: function() {
    if (this.timeoutObj === undefined) {
      return;
    }
    this.timeoutObj = setTimeout(function() {
      election.start();
    }, randTimeout());
  },
  stop: function() {
    if (this.timeoutObj === undefined) {
      return;
    }

    clearTimeout(this.timeoutObj);
  },
  reset: function() {
    this.stop();
    this.start();
  },
};

var heartbeats = {
  intervalObj: undefined,
  start: function() {
    this.intervalObj = setInterval(function() {
      NodeCtx.nodes.forEach(function(n) {
        n.sendHeartbeat();
      });
    }, randTimeout());
  },
  stop: function() {
    if (this.intervalObj !== undefined) {
      clearInterval(this.intervalObj);
    }
  },
};

var election = {
  votes: 0,
  timeoutObj: undefined,
  isAlive: false,
  vote: function() {
    return this.votes++;
  },
  won: function() {
    if ((NodeCtx.nodes.length * 0.5) < this.votes) {
      return true;
    }

    return false;
  },
  start: function() {
    this.votes = 0;
    this.isAlive = true;
    var that = this;
    this.timeoutObj = setTimeout(function() {
      if (that.won()) {
        heartbeats.start();
      }
      that.isAlive = false;
    }, 200);

    NodeCtx.nodes.forEach(function(n) {
      n.sendVotesRequest();
    });
  },
  stop: function() {
    this.isAlive = false;
    this.votes = 0;
    clearTimeout(this.timeoutObj);
  },
};

function randTimeout() {
}

function sendHeartbeat(host) {
}

function sendHeartbeatAck(host) {
}

function sendVote(host) {
}

function sendVotesRequest(host) {
}

function handleVotesRequest(req, res, next) {
  var remoteAddr = req.header('REMOTE_ADDR');

  // Ist die empfangende Node bereits Leader,
  // sende Heartbeat um Kandidatur zu stoppen
  if (NodeCtx.state === 'leader') {
    sendHeartbeat(remoteAddr);
    next();
  }

  // Gebe keinem anderen Kandidate die eigenen Stimme.
  if (NodeCtx.state === 'candidate') {
    next();
  }

  if (NodeCtx.state === 'follower') {
    // todo(tochti): Implement LeaderTimeout
    leaderTimeout.reset();
    sendVote(remoteAddr);
    next();
  }

}

function handleVoteRequest(req, res, next) {
  var remoteAddr = req.header('REMOTE_ADDR');

  if (NodeCtx.state !== 'candidate') {
    next();
  }

  if (election.isAlive()) {
    election.vote();
  }

}

module.exports = {};
module.exports.handleLeaderHeartbeat = function handleLeaderHeartbeat(req, res, next) {
  var remoteAddr = req.header('REMOTE_ADDR');

  if (NodeCtx.state === 'leader') {
    if (NodeCtx.term < req.params.term) {
      NodeCtx.state = 'follower';
      next();
    }

    if (NodeCtx.term >= req.params.term) {
      sendHeartbeat(remoteAddr);
      next();
    }
  }

  if (NodeCtx.state === 'candidate') {
    // todo(tochti): Implement Election
    election.stop();
    next();
  }

  if (NodeCtx.state === 'follower') {
    leaderTimeout.reset();
    sendHeartbeatAck(remoteAddr);
    next();
  }
};

function handleHeartbeatAck(req, res, next) {
  // check if some nodes are down
}

var server = restify.createServer();
var connSpecs = {
  host: '127.0.0.1',
  port: 1314,
};

server.get('/votes', handleVotesRequest);
server.get('/vote', handleVoteRequest);
server.put('/heartbeat', module.exports.handleLeaderHeartbeat);
server.get('/heartbeatAck', handleHeartbeatAck);

server.listen(connSpecs);

leaderTimeout.start();
