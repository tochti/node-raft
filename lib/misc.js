function randPeriod(start, end) {
  return Math.floor((Math.random() * (end - start)) + start);
}

function findNodeByHost(nodes, host) {
  if (nodes.length === 0) {
    return null;
  }

  var found = null;
  nodes.forEach(function(n) {
    if (n.host === host) {
      found = n;
      return;
    }
  });

  return found;
}

function readHost(req) {
  var tmp = req.getHeader('HOST');
  tmp = tmp.split(':');

  var host = tmp[0];
  var port = tmp[1];

  return {
    host: host,
    port: port,
  };
}

module.exports = {
  randPeriod: randPeriod,
  findNodeByHost: findNodeByHost,
  readHost: readHost,
};

