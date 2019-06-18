'use strict';
const SerialPort = require('@serialport/stream')


class Device {

    constructor(socket) {
	this.socket = socket;
    }

    close() {
	if (this.serialPort) {
	    console.log(`${this.serialPort.path}: closing`);
	    this.serialPort.close();
	}
    }

    makeOk(id) {
	if (id != undefined) {
	    var obj = {'jsonrpc': '2.0', 'id': id, 'result': null};
	    this.sendToSocket(obj);
	}
    }

    makeCall(method, params, id) {
	var obj = {'jsonrpc': '2.0', 'id': id, 'method': method, 'params': params};
	this.sendToSocket(obj);
    }

    makeResult(result, id) {
	if (id != undefined) {
	    var obj = {'jsonrpc': '2.0', 'id': id, 'result': result};
	    this.sendToSocket(obj);
	}
    }

    makeError(error, id) {
	if (id != undefined) {
	    var obj = {'jsonrpc': '2.0', 'id': id, 'error': error};
	    this.sendToSocket(obj);
	}
    }

    sendToSocket(obj) {
	var res = JSON.stringify(obj);
//	console.log(`OUT: ${res}`);
	this.socket.send(res);
    }

    // methods

    discover(params, id) {
	var self = this;

	SerialPort.list(function (err, ports) {
	    self.portList = ports;
	    // if the extension has autoScan = True
	    // the first peripheral will be automatically connected
	    for (var i in ports) {
		var port = ports[i]
		var params = {'peripheralId': i,
			      'name': port.comName,
			      'rssi': -10};
		// i is a string below
		self.makeCall('didDiscoverPeripheral', params, port.comName);
	    }
	});
	self.makeOk(id);
    }

    connect(params, id) {
	var self = this;

	var port = self.portList[params.peripheralId];
	self.serialPort = new SerialPort(port.comName, {baudRate: 115200, autoOpen: false});
	console.log(`${self.serialPort.path}: connecting`);

	self.serialPort.on('error', function (error) {
	    console.log(`${self.serialPort.path}: ${error.message}`);
	    var result = {'code': -1000, 'message': error.message};
	    self.makeError(result, id);
	    // no need to close it
	    self.serialPort = null;
	});

	self.serialPort.on('open', function () {
	    console.log(`${self.serialPort.path}: connected`);
	    self.makeOk(id);
	});

	self.serialPort.on('data', (chunk) => {
	    console.log(`${self.serialPort.path}: received ${chunk.length} bytes`);
	    var params = {'message': chunk.toString('base64'),
			  'encoding': 'base64'};
	    // no id as we are not expecting a reply
	    self.makeCall('didReceiveMessage', params);
	});

	self.serialPort.open();
    }

    send(params, id) {
	var message = params.message;
	var encoding = params.encoding;
	const buf = Buffer.from(message, encoding);

	this.serialPort.write(buf);
	console.log(`${this.serialPort.path}: sending ${buf.length} bytes`);
	this.makeResult(buf.length, id);
    }

    write(params, id) {
	var message = params.message
	var encoding = params.encoding
	const buf = Buffer.from(message, encoding)
	console.log(`${this.serialPort.path}: writing ${buf.length} bytes to ${params.characteristicId}`);
	this.makeResult(buf.length, id);
    }

    startNotifications(params, id) {
	console.log(`${this.serialPort.path}: starting notifications on ${params.characteristicId}`);
	this.makeOk(id);
    }

    stopNotifications(params, id) {
	console.log(`${this.serialPort.path}: stopping notifications on ${params.characteristicId}`);
	this.makeOk(id);
    }

    read(params, id) {
	console.log(`${this.serialPort.path}: reading ${params.characteristicId}`);
	var result = {'message': 'DUMMY'}
	this.makeResult(result, id);
    }

}


module.exports = Device;
