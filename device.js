'use strict';
const SerialPort = require('@serialport/stream')


class Device {

    constructor(socket) {
	this.socket = socket;
    }

    close() {
	if (this.serialPort) {
	    console.log(`Closing ${this.serialPort.path}`);
	    this.serialPort.close();
	}
    }

    makeCall(method, params, id) {
	var obj = {'jsonrpc': '2.0', 'id': id, 'method': method, 'params': params};
	this.sendToSocket(obj);
    }

    makeReturn(result, id) {
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

    discover(params) {
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
	return null;
    }

    connect(params) {
	var self = this;

	var port = self.portList[params.peripheralId];
	self.serialPort = new SerialPort(port.comName, {baudRate: 115200});
	console.log(`Connecting to ${self.serialPort.path}`);

	self.serialPort.on('data', (chunk) => {
	    console.log(`Received ${chunk.length} bytes from ${self.serialPort.path}`);
	    var params = {'message': chunk.toString('base64'),
			  'encoding': 'base64'};
	    // no id as we are not expecting a reply
	    self.makeCall('didReceiveMessage', params);
	});

	return null;
    }

    send(params) {
	var message = params.message
	var encoding = params.encoding
	const buf = Buffer.from(message, encoding)

	this.serialPort.write(buf)
	console.log(`Sending ${buf.length} bytes to ${this.serialPort.path}`);
	return buf.length;
    }

    write(params) {
	var message = params.message
	var encoding = params.encoding
	const buf = Buffer.from(message, encoding)
	console.log(`Writing ${buf.length} bytes to ${params.characteristicId} of ${this.serialPort.path}`);
	return buf.length;
    }

    startNotifications(params) {
	console.log(`Starting notifications on ${params.characteristicId} of ${this.serialPort.path}`);
	return null;
    }

    read(params) {
	console.log(`Reading ${params.characteristicId} of ${this.serialPort.path}`);
	var result = {'message': 'DUMMY'}
	return result;
    }

}


module.exports = Device;
