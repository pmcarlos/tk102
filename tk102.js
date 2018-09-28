/*
Name:         tk102
Description:  TK102 GPS server for Node.js
Author:       Franklin van de Meent (https://frankl.in)
Source:       https://github.com/fvdm/nodejs-tk102
Feedback:     https://github.com/fvdm/nodejs-tk102/issues
License:      Unlicense / Public Domain (see UNLICENSE file)
              (https://github.com/fvdm/nodejs-tk102/raw/master/UNLICENSE)
*/

var net = require ('net');
var EventEmitter = require ('events') .EventEmitter;
var iconv = require ('iconv-lite');
var tk102 = new EventEmitter ();

// defaults
tk102.settings = {
  ip: '0.0.0.0',
  port: 0, // 0 = random, see `listening` event
  connections: 10,
  timeout: 40,
  encoding: 'utf8'
};


// Catch uncaught exceptions (server kill)
process.on ('uncaughtException', function (err) {
  var error = new Error ('uncaught exception');
  error.error = err;
  console.trace (error);
});

// Create server
tk102.createServer = function (vars) {
  // override settings
  if( typeof vars === 'object' && Object.keys (vars) .length >= 1 ) {
    for (var key in vars) {
      tk102.settings [key] = vars [key];
    }
  }

  // start server
  tk102.server = net.createServer (function (socket) {
    // socket idle timeout
    if (tk102.settings.timeout > 0) {
      socket.setTimeout (parseInt (tk102.settings.timeout * 1000), function () {
        tk102.emit ('timeout', socket);
        socket.end ();
      });
    }
  }) .listen (tk102.settings.port, tk102.settings.ip, function () {
    // server ready
    tk102.emit ('listening', tk102.server.address ());
  });

  // maximum number of slots
  tk102.server.maxConnections = tk102.settings.connections;

  // inbound connection
  tk102.server.on ('connection', function (socket) {
    if (tk102.settings.encoding !== 'utf8') {
      socket.setEncoding ('binary');
    }
    //tk102.emit ('connection', socket);
    var data = '';

    socket.on ('data', async function (ch) {
      const ch_ = [...ch]
      const an = ch_[11]
      // console.log('ch_', ch_)
      const year = `${ch_[67].toString(16)} ${ch_[68].toString(16)}`
      let buffer
      let ack_buffer
      ch_.forEach(val => {
        buffer = buffer ? buffer + ' ' + val.toString(16) : val.toString(16)
      })
      const month = ch_.splice(66,1).toString('hex')
      const day = ch_.splice(65,1).toString('hex')
      const hour = ch_.splice(64,1).toString('hex')
      const minute = ch_.splice(63,1).toString('hex')
      const second = ch_.splice(62,1).toString('hex')
      const speedDirection = ch_.splice(60,2).toString('hex')
      const groundSpeed = ch_.splice(56,4).toString('hex')
      const longitude = ch_.splice(44,4).toString('hex')
      const latitude = ch_.splice(48,4)
      let sum = 0
      const ack = [ch_[0],ch_[1],ch_[2],ch_[3], 04, ch_[5], ch_[6], ch_[7], ch_[8],00, 00, 00, 00, 00, 00, ch_[11],  00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00 ]
      for(let i = 0; i < ack.length; i++) {
        sum = (i >=4 && i <=ack.length) ? sum + ack[i] : sum
      }
      ack.push(sum)
      ack.forEach(val => {
        ack_buffer = ack_buffer ? ack_buffer + ' ' + val.toString(16) : val.toString(16)
      })
      console.log('year', year, buffer)
      const newBuffer = new Buffer(ack)
      console.log('an', ch_[11],'sum', sum,'buffer', newBuffer)
      socket.write(newBuffer)
      
      
    });

    // error
    socket.on ('error', function (error) {
      var err = new Error ('Socket error');
      err.reason = err.message;
      err.socket = socket;
      err.settings = tk102.settings;
      tk102.emit ('error', err);
    });
  });

  tk102.server.on ('error', function (error) {
    if (error === 'EADDRNOTAVAIL') {
      var err = new Error ('IP or port not available');
    } else {
      var err = new Error ('Server error');
    }

    err.reason = err.message;
    err.input = tk102.settings;
    tk102.emit ('error', err);
  });
};




// ready
module.exports = tk102;