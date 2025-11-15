//// get_geo_data.js (final update)
//(function () {
//
//    window.__lastGps = null;
//
//    function requestGPS() {
//        if (typeof Android !== "undefined") {
//            try {
//                Android.requestGPS();
//            } catch (e) {
//                console.warn("Android.requestGPS error:", e);
//            }
//        } else {
//            console.warn("Android interface not available");
//        }
//    }
//
//    // Нов JSON callback
//    window.receiveGPSJSON = function (jsonStr) {
//
//        let data;
//        try {
//            data = JSON.parse(jsonStr);
//        } catch (e) {
//            console.error("Invalid JSON from Android:", jsonStr);
//            return;
//        }
//
//        let lat = parseFloat(data.lat);
//        let lng = parseFloat(data.lng);
//
//        // --- Валидации ---
//        if (!lat || !lng) {
//            console.warn("Invalid coords:", lat, lng);
//            return;
//        }
//
//        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
//            console.warn("Out of range coords:", lat, lng);
//            return;
//        }
//
//        // --- Избягване на спам: ако координатите са същите — не пращаме ---
//        if (window.__lastGps &&
//            window.__lastGps.lat === lat &&
//            window.__lastGps.lng === lng
//        ) {
//            return; // skip
//        }
//
//        window.__lastGps = { lat, lng };
//
//        // --- Изпращане към PHP ---
//        $.post("includes/log_gps.php", {
//            lat: lat,
//            lng: lng,
//            accuracy: data.accuracy || 0,
//            speed: data.speed || 0,
//            bearing: data.bearing || 0,
//            altitude: data.altitude || 0
//        });
//    };
//
//    // fallback: call every 5s
//    setInterval(requestGPS, 5000);
//    requestGPS();
//
//})();

// get_geo_data.js (final, fully compatible with alarms.js)
(function(){
    window.__lastGps = null;

    // --- Изпращане на заявка към Android WebView ---
    function requestGPS() {
        if (typeof Android !== "undefined") {
            try {
                Android.requestGPS();
            } catch(e){
                console.warn('Android.requestGPS error', e);
            }
        } else {
            console.warn("Android interface not available");
        }
    }

    // --- Callback от Android с JSON данни ---
    window.receiveGPSJSON = function(jsonStr) {
        if (!jsonStr) return;

        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch(e) {
            console.error("Invalid JSON from Android:", e, jsonStr);
            return;
        }

        const lat = parseFloat(data.lat);
        const lng = parseFloat(data.lng);
        const speed = parseFloat(data.speed) || 0;
        const bearing = parseFloat(data.bearing) || 0;
        const accuracy = parseFloat(data.accuracy) || -1;
        const altitude = parseFloat(data.altitude) || null;

        // --- Лог за дебъг ---
        // console.log("GPS Update:", lat, lng, speed, bearing, accuracy, altitude);

        // --- Запис на GPS в базата за логване ---
        $.post("includes/log_gps.php", {
            lat: lat,
            lng: lng,
            accuracy: accuracy,
            speed: speed,
            bearing: bearing,
            altitude: altitude
        });

        // --- Подаване на координати към alarms.js за визуализация ---
        if (typeof window.updateCarFromWebView === 'function') {
            window.updateCarFromWebView(lat, lng, speed, bearing, accuracy, altitude);
        } else {
            // ако картата още не е заредена, запазваме последните координати
            window.__lastGps = { lat, lng, speed, bearing, accuracy, altitude, ts: Date.now() };
        }
    };

    // --- Fallback: извикване на GPS всяка 5 сек (Android WebView) ---
    setInterval(requestGPS, 5000);
    requestGPS();
})();
