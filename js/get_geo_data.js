// js/get_geo_data.js

(function(){
    // Expose to global (for debugging / fallback)
    window.__lastGps = null;

    function requestGPS() {
        if (typeof Android !== "undefined") {
            Android.requestGPS();
        } else {
            // Could optionally try browser geolocation as fallback
            console.warn("Android interface not available");
        }
    }

    // Android callback — всички данни
    window.receiveGPS = function(lat, lng, acc, speed, bearing, altitude) {
        lat = parseFloat(lat);
        lng = parseFloat(lng);
        acc = (acc !== undefined) ? parseFloat(acc) : -1;
        speed = (speed !== undefined) ? parseFloat(speed) : -1;
        bearing = (bearing !== undefined) ? parseFloat(bearing) : 0;
        altitude = (altitude !== undefined) ? parseFloat(altitude) : null;

        // Save last locally (fallback)
        window.__lastGps = { lat, lng, acc, speed, bearing, altitude, ts: Date.now() };

        // 1) Update map marker immediately (if map is open)
        if (typeof window.updateCarFromWebView === "function") {
            window.updateCarFromWebView(lat, lng, speed, bearing, acc, altitude);
        }

        // 2) POST to server log
        try {
            $.post("includes/log_gps.php", {
                lat: lat,
                lng: lng,
                accuracy: acc,
                speed: speed,
                bearing: bearing,
                altitude: altitude
            }).fail(function() {
                // Optional: push to localStorage queue for retry
                console.warn("Failed to POST GPS to server");
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
