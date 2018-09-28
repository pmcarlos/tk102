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
      parseData(ch, socket)
      
      
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

const getHex = (data, index, length) => {
  let hex = ''
  return new Promise((resolve, reject) => {
    for(let i = length -1; i >= 0; i--) {
      hex += data[index+i].toString(16).length == 2 ? data[index+i].toString(16) : `0${data[index+i].toString(16)}`
      if(i==0) resolve(hex)
    }
  })
  
  
}
const parseData = async (ch, socket) => {
  const ch_ = [...ch]
  const an = ch_[11]
  // console.log('ch_', ch_)
  const year = await getHex(ch_,67,2)
  const month = ch_[66]
  const day = ch_[65]
  const longitude = await getHex(ch_,44,4)
  const latitude = await getHex(ch_,48,4)
  const groundSpeed = await getHex(ch_,56,4)
  let buffer
  let ack_buffer
  ch_.forEach(val => {
    buffer = buffer ? buffer + ' ' + val.toString(16) : val.toString(16)
  })
  const hour = await getHex(ch_,64,1)
  const minute = await getHex(ch_,63,1)
  const second = await getHex(ch_,62,1)
  const speedDirection = await getHex(ch_,60,2)
  const unitId = await getHex(ch_,5,4)
  let sum = 0
  const ack = [ch_[0],ch_[1],ch_[2],ch_[3], 04, ch_[5], ch_[6], ch_[7], ch_[8],00, 00, 00, 00, 00, 00, ch_[11],  00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00 ]
  for(let i = 0; i < ack.length; i++) {
    sum = (i >=4 && i <=ack.length) ? sum + ack[i] : sum
  }
  ack.push(sum)
  ack.forEach(val => {
    ack_buffer = ack_buffer ? ack_buffer + ' ' + val.toString(16) : val.toString(16)
  })
  console.log('buffer', buffer, 'unit----------', unitId, '--------')
  console.log('latitude', (toInt32(parseInt('0x'+latitude))/100000000)*180/Math.PI, 'longitude', (toInt32(parseInt('0x'+longitude))/100000000)*180/Math.PI, 'groundSpeed', groundSpeed, 'speedDirection', speedDirection)
  console.log('date', `${parseInt('0x'+year)}-${month}-${day} ${hour}:${minute}:${second}`)
  const newBuffer = new Buffer(ack)
  // console.log('an', ch_[11],'sum', sum,'buffer', newBuffer)
  socket.write(newBuffer)
}

function toInt32(x) {
  var uint32 = x;
  if (uint32 >= Math.pow(2, 31)) {
      return uint32 - Math.pow(2, 32)
  } else {
      return uint32;
  }
}


// ready
module.exports = tk102;