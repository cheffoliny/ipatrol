// js/get_geo_data.js

(function(){
    window.__lastGps = null;

    function requestGPS() {
        if (typeof Android !== "undefined" && typeof Android.requestGPS === "function") {
            try {
                Android.requestGPS(); // Android ще извика обратно window.receiveGPS(...)
                console.log("JS -> Android.requestGPS() called");
            } catch (e) {
                console.warn("Error calling Android.requestGPS()", e);
            }
        } else {
            // Fallback: try browser geolocation (optional)
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (pos) {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const acc = pos.coords.accuracy || -1;
                    const speed = pos.coords.speed || -1;
                    const bearing = pos.coords.heading || 0;
                    const altitude = pos.coords.altitude || -1;
                    window.receiveGPS(lat, lng, acc, speed, bearing, altitude);
                }, function(err){
                    console.warn("Browser geolocation error", err);
                }, {maximumAge: 5000, timeout: 3000});
            } else {
                console.warn("Android interface not available and geolocation not supported");
            }
        }
    }

    // Android callback — всички данни
    window.receiveGPS = function(lat, lng, acc, speed, bearing, altitude) {
        // normalize numbers
        lat = parseFloat(lat);
        lng = parseFloat(lng);
        acc = (acc !== undefined && acc !== null) ? parseFloat(acc) : -1;
        speed = (speed !== undefined && speed !== null) ? parseFloat(speed) : -1;
        bearing = (bearing !== undefined && bearing !== null) ? parseFloat(bearing) : 0;
        altitude = (altitude !== undefined && altitude !== null) ? parseFloat(altitude) : -1;

        window.__lastGps = { lat, lng, acc, speed, bearing, altitude, ts: Date.now() };

        // update map instantly if function exists
        if (typeof window.updateCarFromWebView === "function") {
            try {
                window.updateCarFromWebView(lat, lng, speed, bearing, acc, altitude);
            } catch (e) {
                console.warn("updateCarFromWebView error", e);
            }
        }

        // POST to server (path relative to site root; adjust if needed)
        try {
            $.post("includes/log_gps.php", {
                lat: lat,
                lng: lng,
                accuracy: acc,
                speed: speed,
                bearing: bearing,
                altitude: altitude
            }).done(function(resp) {
                console.log("log_gps response:", resp);
            }).fail(function(xhr, status, err) {
                console.warn("Failed to POST GPS to server", status, err);
            });
        } catch (e) {
            console.error("Error posting GPS", e);
        }
    };

    // Auto request every 5s
    setInterval(requestGPS, 5000);

    // Also request immediately on load
    requestGPS();
})();
