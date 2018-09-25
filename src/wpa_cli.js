var wpa = require('./');

var handle = new wpa('wlan0');
handle.connect();

handle.on('event-3', function (evt) { // Log all the level 3 messages
    console.log(evt);
});

handle.on('event-2', function (evt) { // Log all the level 2 messages
	console.log(evt);
});

handle.on('event-1', function (evt) { // Log all the level 1 messages
	console.log(evt);
});


function addNetwork() {
    handle.addNetwork({ssid: '"test1234"', key_mgmt: "NONE"}, function (err, newId) {
        if (err) {
            console.error(err);
            return false;
        }

        console.log('New network id:', newId);

        handle.enableNetwork(newId, function (status) {
            console.log('Enable status:', status);
            handle.save( function(status){
                console.log( 'Save status:', status );
            })
        });
    });
}

handle.scan(function () {
    handle.removeAllNetworks( function( status ){
		handle.getScanResults(function (err, data) {
			console.log(err, data);

			addNetwork(); // I made a separate function just not to add all of the code above in this callback.
		});

	});
});