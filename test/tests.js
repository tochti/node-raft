/* jshint node:true, mocha:true, esnext:true */
'use strict';

var http = require('http');
var assert = require('assert');
var node = require('../lib/node.js');
var follower = require('../lib/follower.js');
var misc = require('../lib/misc.js');

describe('node-raft', function() {

  describe('state machine', function() {});

  describe('misc tools', function() {
    it('randPeriod should generate random times between x and y', function() {
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function(i) {
        var r = misc.randPeriod(i, i + 2);
        assert((i <= r && r <= (i + 2)));
      });
    });

    it('findNodeByHost should return RemoteNode by hostname', function() {
      var nodes = [
        new node.RemoteNode({
          name: 'node-1',
          host: '192.168.1.1',
          port: 80,
        }),
        new node.RemoteNode({
          name: 'node-2',
          host: '192.168.1.2',
          port: 80,
        })
      ];

      var n = misc.findNodeByHost(nodes, '192.168.1.1');
      assert.equal(nodes[0], n);

    });

    it('findNodeByHost should return null if no node found', function() {
      var nodes = [
        new node.RemoteNode({
          name: 'node-1',
          host: '192.168.1.1',
          port: 80,
        }),
        new node.RemoteNode({
          name: 'node-2',
          host: '192.168.1.2',
          port: 80,
        })
      ];

      var n = misc.findNodeByHost(nodes, 'none');
      assert.equal(null, n);

    });

    it('readHost should return host and port', function() {
      var reqOpts = {
        hostname: '127.0.0.1',
        port: 2122,
        path: '/heartbeat',
        method: 'PUT',
      };

      var req = http.request(reqOpts);
      req.end();
      var r = misc.readHost(req);
      assert.equal('127.0.0.1', r.host);
      assert.equal(2122, r.port);
    });
  });

  describe('remote node', function() {

    it('expect name,host,port data', function() {
      new node.RemoteNode({
        name: 'node-1',
        host: '192.168.1.1',
        port: 80,
      });

      assert.throws(function() {
        new node.RemoteNode({
          name: 'node-1',
          host: '192.168.1.1',
        });
      }, node.MissingFieldError);

      assert.throws(function() {
        new node.RemoteNode({
          name: 'node-1',
          port: 80,
        });
      }, node.MissingFieldError);

      assert.throws(function() {
        new node.RemoteNode({
          host: '192.168.1.1',
          port: 80,
        });
      }, node.MissingFieldError);

    });

    it('expect name,host,port get methods', function() {
      var n = new node.RemoteNode({
        name: 'node-1',
        host: '192.168.1.1',
        port: 80,
      });

      assert.equal('node-1', n.name);
      assert.equal('192.168.1.1', n.host);
      assert.equal(80, n.port);

    });
  });

  describe('follower', function() {

    it('should reset timeout after receiving a heartbeat and response with statuscode 200', function(done) {

      var leaderData = {
        name: 'leader-node',
        host: '192.168.1.1',
        port: 2317,
        term: 1,
      };

      var leader = new node.RemoteNode({
        name: leaderData.name,
        host: leaderData.host,
        port: leaderData.port,
      });

      var reqBody = {
        name: leaderData.name,
        term: leaderData.term,
      };

      var jsonBody = JSON.stringify(reqBody);

      var reqOpts = {
        hostname: leaderData.host,
        port: leaderData.port,
        path: '/heartbeat',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': jsonBody.length
        }
      };

      var req = http.request(reqOpts);
      req.write(jsonBody);
      req.end();

      var res = {
        send: function(code) {
          assert.equal(200, code);
        },
        end: function(code) {},
      };

      var next = function() {
        done();
        f.stop(nodeSpecs, switchState);
      };

      var switchState = function(state) {
        assert.fail('should never called');
      };

      var nodeSpecs = {
        name: 'node-1',
        host: '192.168.1.2',
        port: 2318,
        term: 1,
        nodes: [leader],
      };

      var f = new follower.Follower();
      f.start(nodeSpecs, switchState);
      f.heartbeat(nodeSpecs, switchState, req, res, next);

    });

    it('should not reset heartbeat timeout if heartbeat from an unknow leader', function(done) {
      var leaderData = {
        name: 'leader-node',
        host: '192.168.1.1',
        port: 2317,
        term: 1,
      };

      var leader = new node.RemoteNode({
        name: leaderData.name,
        host: leaderData.host,
        port: leaderData.port,
      });

      var reqBody = {
        name: leaderData.name,
        term: leaderData.term,
      };

      var jsonBody = JSON.stringify(reqBody);

      var reqOpts = {
        hostname: '172.168.1.1',
        port: leaderData.port,
        path: '/heartbeat',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': jsonBody.length
        }
      };

      var req = http.request(reqOpts);
      req.write(jsonBody);
      req.end();

      var res = {
        send: function(code) {
          assert.fail('should never called');
        },
        end: function(code) {},
      };

      var nextCo = function*() {
        yield;
        done();
      };

      var nexter = nextCo();

      var next = function() {
        nexter.next();
      };

      var switchState = function(state) {
        assert.fail('should never called');
      };

      var nodeSpecs = {
        name: 'node-1',
        host: '192.168.1.2',
        port: 2318,
        term: 1,
        nodes: [leader],
      };

      var f = new follower.Follower();
      f.start(nodeSpecs, switchState);
      f.heartbeat(nodeSpecs, switchState, req, res, next);
      f.heartbeat(nodeSpecs, switchState, req, res, next);
      f.stop(nodeSpecs, switchState);

    });

    it('should switch to candidate state if no heartbeat received', function(done) {
      var switchState = function(state) {
        if (state === 'candidate') {
          done();
        }
      };

      var nodeSpecs = {
        name: 'node-1',
        host: '192.168.1.2',
        port: 2318,
        term: 1,
        nodes: [],
      };

      var f = new follower.Follower();
      f.start(nodeSpecs, switchState);

    });


    it('should vote when receives a vote request', function(done) {
      var leaderData = {
        name: 'leader-node',
        host: '192.168.1.1',
        port: 2317,
        term: 1,
      };

      var leader = new node.RemoteNode({
        name: leaderData.name,
        host: leaderData.host,
        port: leaderData.port,
      });

      var reqBody = {
        name: leaderData.name,
        term: leaderData.term,
      };

      var jsonBody = JSON.stringify(reqBody);

      var reqOpts = {
        hostname: leaderData.host,
        port: leaderData.port,
        path: '/vote',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': jsonBody.length
        }
      };

      var req = http.request(reqOpts);
      req.write(jsonBody);
      req.end();

      var res = {
        send: function(code) {
          assert.equal(200, code);
        },
        end: function(code) {},
      };

      var switchState = function(state) {
        assert.fail('should never called');
      };

      var next = function() {
        done();
      };

      var nodeSpecs = {
        name: 'node-1',
        host: '192.168.1.2',
        port: 2318,
        term: 1,
        nodes: [leader],
      };

      var f = new follower.Follower();
      f.vote(nodeSpecs, switchState, req, res, next);

    });

  });

});
