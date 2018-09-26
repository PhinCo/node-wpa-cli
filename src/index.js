const unix = require('unix-dgram')
const EventEmitter = require('events').EventEmitter

class APStation {
	constructor(bssid, frequency, signal, encryption, ssid) {
		const encRegex = /\[([A-Z0-9\-]+)\]/g

		const encArray = [];
		let match;

		while ((match = encRegex.exec(encryption)) !== null)
			encArray.push(match[1]);

		this.bssid = bssid
		this.frequency = frequency
		this.encryption = encArray
		this.signal = signal
		this.ssid = ssid
	}
}

class WpaCLI extends EventEmitter {
	constructor(ifname) {
		super()

		if (typeof ifname !== 'string') {
			throw new Error('ifname must be a string')
		}

		this.ignoreAck = false
		this.ifname = ifname
	}

	async connect(callback) {
		const self = this

			const serverPath = '/var/run/wpa_supplicant/' + this.ifname;
			const clientPath = '/tmp/wpa_ctrl' + Math.random().toString(36).substr(1);
			const error = this._onError.bind(this);

			this.client = unix.createSocket('unix_dgram')
				.on('message', this._onMessage.bind(this))
				.on('error', error);

			// I should probably rewrite this using promises..
			this._connect(serverPath, function (error) {
				if (error) return error('unable to connect to interface');
				self.listen(clientPath, function (error) {
					if (error) return error('unable to listen for events');
					self.attach(function (error) {
						if (error) return error('unable to attach to events');

						self.emit('connect');
						if (typeof callback === 'function')
							callback();
					})
				})
			})
	}

	_onError(error) {
		if (this._handleError) return this._handleError(error);
		this.emit('error', error);
	}

	_connect(path, cb) {
		const done = function (error) {
			this.client.removeListener('connect', done);
			delete this._handleError;
			cb.call(this, error)
		}.bind(this);

		this._handleError = done;
		this.client.once('connect', done)
			.connect(path)
	}

	listen(clientPath, cb) {
		const done = function (error) {
			this.client.removeListener('listening', done);
			delete this._handleError;
			cb.call(this, error)
		}.bind(this);

		this._handleError = done;
		this.client.once('listening', done)
			.bind(clientPath)
	}

	request(req, cb) {
		this._handleReply = cb;
		this.client.send(new Buffer(req));
	}

	_onMessage(msg) {
		let handleReply;
		this.emit('rawMsg', msg);

		if (msg.length > 3 && msg[0] === 60 && msg[2] === 62) {
			this._onCtrlEvent(msg[1] - 48, msg.slice(3))
		} else if (this.ignoreAck && msg.toString().substr(0, 3).indexOf('OK') !== -1) { // This is just an ack message, ignoring it...
			this.ignoreAck = false;
		} else if ((handleReply = this._handleReply)) {
			delete this._handleReply;
			handleReply.call(this, msg.toString().trim())
		}
	}

	_onCtrlEvent(level, msg) {
		const messageParts = msg.toString().split(' ');

		const messageName = messageParts[0];
		messageParts.splice(1);

		this.emit(messageParts);
		this.emit('event-' + level, messageName, messageParts);
	}

	setLevel(level, cb) {
		this.request('LEVEL ' + level, function (msg) {
			if (msg === 'OK')
				cb.call(this, null);
			else
				cb.call(this, 'level: ' + msg);
		});
	}

	attach(cb) {
		this.request('ATTACH', function (msg) {
			if (msg === 'OK')
				cb.call(this, null);
			else
				cb.call(this, 'attach: ' + msg);
		});
	}

	detach(cb) {
		this.request('DETACH', function (msg) {
			if (msg === 'OK')
				cb.call(this, null);
			else
				cb.call(this, 'detach: ' + msg);
		})
	}

	getStatus(cb) {
		this.ignoreAck = true;
		this.request('STATUS', function (msg) {
			const status = {};
			const lines = msg.toString().split('\n');
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const j = line.indexOf('=');
				if (j > 0) {
					status[line.substr(0, j)] = line.substr(j + 1)
				}
			}

			if (status.wpa_state)
				cb.call(this, null, status);
			else
				cb.call(this, 'unable to get status');
		});
	}

	getScanResults(cb) {
		this.ignoreAck = true;
		this.request('SCAN_RESULTS', function (msg) {
			const stations = [];
			const lines = msg.toString().split('\n');

			for (let i = 1; i < lines.length; i++) {
				const lineSplit = lines[i].split('\t');
				stations.push(new APStation(lineSplit[0], lineSplit[1], lineSplit[2], lineSplit[3], lineSplit[4]));
			}

			cb.call(this, null, stations);
		});
	}

	scan(cb) {
		this.ignoreAck = true;
		this.request('SCAN');

		this.once('CTRL-EVENT-SCAN-RESULTS', cb);
	}

	addNetwork(params, cb) {
		const self = this

		if (typeof params !== 'object') {
			cb.call(this, 'wrong params type');
			return false;
		}

		this.ignoreAck = true;
		let done = false;

		this.request('ADD_NETWORK', function (network_id) {
			for (let key in params)
				if (done) {
					break
				} else if (params.hasOwnProperty(key)) {
					const request = 'SET_NETWORK ' + network_id + ' ' + key + ' ' + params[key]
					console.log("REQUEST: ", request)
					self.request(request, function (status) {
						if (status !== 'OK') {
							if (typeof cb === 'function')
								cb.call(this, 'Param error')
							done = true;
						}

					})
				}

			if (!done && typeof cb === 'function')
				cb.call(this, null, network_id)
		})
	}

	removeAllNetworks(cb) {
		this.request('REMOVE_NETWORK ' + 'all', cb)
	}

	removeNetwork(netId, cb) {
		this.request('REMOVE_NETWORK ' + netId, cb)
	}

	disableAllNetworks(netId, cb) {
		this.request('DISABLE_NETWORK ' + 'all', cb)
	};

	disableNetwork(netId, cb) {
		this.request('DISABLE_NETWORK ' + netId, cb)
	};

	enableNetwork(netId, cb) {
		this.request('ENABLE_NETWORK ' + netId, cb)
	};

	save(cb) {
		this.request('SAVE_CONFIG', cb)
	};

}

module.exports = WpaCLI;

/* http://w1.fi/wpa_supplicant/devel/ctrl_iface_page.html
 * states
 * disconnected inactive scanning authenticating associating associated
 * 4way_handshake group_handshake completed unknown interface_disabled */
