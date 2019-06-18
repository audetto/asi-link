const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const SerialPort = require('@serialport/stream')
const MockBinding = require('@serialport/binding-mock')
const Device = require('./device')

SerialPort.Binding = MockBinding

// dummy ports added to test
MockBinding.createPort('/dev/ROBOT', { echo: true })
MockBinding.createPort('/dev/MBOT', { echo: true })

const server = https.createServer({
    cert: fs.readFileSync('scratch-certs.pem'),
    key: fs.readFileSync('scratch-key.pem')
});
const wss = new WebSocket.Server({server: server, host: 'device-manager.scratch.mit.edu'});

wss.on('connection', function (ws, request) {
    var device = new Device(ws);
    ws.on('message', function (data) {
//	console.log(`IN: ${data}`);
	var obj = JSON.parse(data);

	var params = obj.params;

	if ('method' in obj) {
	    var method = device[obj.method];
	    if (method) {
		// this is needed to bind "this" to device
		var result = method.call(device, params, obj.id);
	    } else {
		console.log(`UNSUPPORTED: ${data}`);
		var error = {'code': -32601, 'message': 'Method not found'};
		device.makeError(error, obj.id);
	    }
	} else {
//	    console.log(`REPLY: ${data}`);
	}
    });
    ws.on('close', function (code, reason) {
	device.close();
	device = null;
    });
});

server.listen(20110);
