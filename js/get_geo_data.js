// get_geo_data.js (update)
(function(){
    window.__lastGps = null;

    function requestGPS() {
        if (typeof Android !== "undefined") {
            try { Android.requestGPS(); } catch(e){ console.warn('Android.requestGPS error', e); }
        } else {
            console.warn("Android interface not available");
        }
    }

    // Нов JSON callback (по-сигурен)
    /*
    window.receiveGPSJSON = function(jsonStr) {
        try {
            // Debug: логваме суровия json string
            console.log('RAW receiveGPSJSON:', jsonStr);

            // Някои WebView може да предадат вече string с кавички - премахваме ако е нужно
            // Ако jsonStr е вече обект (рядко), използваме го директно
            let payload;
            if (typeof jsonStr === 'string') {
                // Ако е JSON в кавички, пробваме parse
                try {
                    payload = JSON.parse(jsonStr);
                } catch (err) {
                    // Ако е двойно ескейпнат JSON (дори по-рядко), опитваме още веднъж
                    payload = JSON.parse(jsonStr.replace(/\\"/g,'"'));
                }
            } else {
                payload = jsonStr;
            }

            console.log('PARSED payload:', payload);

            // Нормализиране - замяна на запетаи с точки (в случай че има)
            let latRaw = String(payload.lat).replace(',', '.');
            let lngRaw = String(payload.lng).replace(',', '.');

            // Debug: преди парсване
            console.log('latRaw, lngRaw:', latRaw, lngRaw);

            let lat = parseFloat(latRaw);
            let lng = parseFloat(lngRaw);

            // Ако невалидни -> лог и exit
            if (!isFinite(lat) || !isFinite(lng)) {
                console.error('Invalid lat/lng values after parse:', latRaw, lngRaw, '=>', lat, lng);
                return;
            }

            const acc = payload.accuracy !== undefined ? parseFloat(String(payload.accuracy).replace(',', '.')) : -1;
            const speed = payload.speed !== undefined ? parseFloat(String(payload.speed).replace(',', '.')) : -1;
            const bearing = payload.bearing !== undefined ? parseFloat(String(payload.bearing).replace(',', '.')) : -1;
            const altitude = payload.altitude !== undefined ? parseFloat(String(payload.altitude).replace(',', '.')) : -1;

            window.__lastGps = { lat, lng, acc, speed, bearing, altitude, ts: Date.now() };
            console.log('Normalized GPS:', window.__lastGps);

            // update map immediately if function exists
            if (typeof window.updateCarFromWebView === "function") {
                window.updateCarFromWebView(lat, lng, speed, bearing, acc, altitude);
            }

            // POST to server
            $.post("includes/log_gps.php", {
                lat: lat.toString(),
                lng: lng.toString(),
                accuracy: acc,
                speed: speed,
                bearing: bearing,
                altitude: altitude
            }).done(function(r){
                console.log('log_gps.php response:', r);
            }).fail(function(err){
                console.warn("Failed to POST GPS to server", err);
            });

        } catch (e) {
            console.error('receiveGPSJSON error:', e, jsonStr);
        }
    };*/
    window.receiveGPSJSON = function(jsonStr) {
        let data = JSON.parse(jsonStr);

        let lat = data.lat;
        let lng = data.lng;

        console.log("RAW_FROM_ANDROID:", data);
        console.log("LAT", lat, "LNG", lng);

        $.post("includes/log_gps.php", {
            lat: lat,
            lng: lng,
            accuracy: data.accuracy,
            speed: data.speed,
            bearing: data.bearing,
            altitude: data.altitude
        });
    };

    // fallback: call every 5s
    setInterval(requestGPS, 5000);
    requestGPS();
})();
