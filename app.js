const WebSocket = require('ws');
const SerialPort = require('@serialport/stream')
const MockBinding = require('@serialport/binding-mock')

SerialPort.Binding = MockBinding

// dummy ports added to test
MockBinding.createPort('/dev/ROBOT', { echo: true })
MockBinding.createPort('/dev/MBOT', { echo: true })

// port used by Scratch Link
const wss = new WebSocket.Server({ port: 20110 });

function make_result(json_rpc, id, result) {
    var obj = {'jsonrpc': json_rpc, 'id': id, 'result': result};
    return obj;
}

function make_call(json_rpc, id, method, params) {
    var obj = {'jsonrpc': json_rpc, 'id': id, 'method': method, 'params': params};
    return obj
}

function return_obj(websocket, obj) {
    var res = JSON.stringify(obj);
    console.log(`OUT: ${res}`);
    websocket.send(res);
}

// should go inside wss.connection()
var global_ports = null;
var open_port = null;

const methods = {
    discover: function(ws, params) {
	SerialPort.list(function (err, ports) {
	    global_ports = ports;
	    for (var i in ports) {
		var port = ports[i]
		var params = {'peripheralId': i,
			      'name': port.comName,
			      'rssi': -10};
		var out = make_call('2.0', 101, 'didDiscoverPeripheral', params);
		return_obj(ws, out);
	    }
	});
	return null;
    },

    connect: function(ws, params) {
	var port = global_ports[params.peripheralId];
	if (open_port) {
	    open_port.close();
	    open_port = null;
	}
	open_port = new SerialPort(port.comName, baudRate=115200);
	open_port.on('data', (chunk) => {
	    console.log(`Received ${chunk.length} bytes of data`);
	    // this is the BT Classic version of the protocol
	    // do we really want to support BTLE?
	    var params = {'message': chunk.toString('base64'),
			  'encoding': 'base64'};
	    var out = make_call('2.0', 102, 'didReceiveMessage', params);
	    return_obj(ws, out);
	});
	return null;
    },

    send: function(ws, params) {
	var message = params.message
	var encoding = params.encoding
	const buf = Buffer.from(message, encoding)

	open_port.write(buf)
	console.log(`Sending ${buf.length} bytes to device`);
	return buf.length;
    },

    write: function(ws, params) {
	var message = params.message
	var encoding = params.encoding
	const buf = Buffer.from(message, encoding)
	console.log(`Writing ${buf.length} bytes to ${params.characteristicId}`);
	return buf.length;
    },

    startNotifications: function(ws, params) {
	console.log(`Starting notifications on ${params.characteristicId}`);
	return null;
    },

    read: function(ws, params) {
	console.log(`Reading ${params.characteristicId}`);
	var result = {'message': 'DUMMY'}
	return result;
    }
};

wss.on('connection', function connection(ws, request) {
    ws.on('message', function incoming(data) {
//	console.log(`IN: ${data}`);
	var obj = JSON.parse(data);

	var params = obj.params;

	if ('method' in obj) {
	    var method = obj.method;
	    if (method in methods) {
		var func = methods[obj.method];

		var res = func(ws, params);
		var out = make_result(obj.jsonrpc, obj.id, res);
		return_obj(ws, out);
	    } else {
		console.log(`UNSUPPORTED: ${data}`);
	    }
	} else {
	    console.log(`REPLY: ${data}`);
	}
    });
});
