function requestGPS() {
    if (typeof Android !== "undefined") {
        Android.requestGPS();
    }
}

// Android callback — тук идват данните от WebView
function receiveGPS(lat, lng, acc, speed, bearing, altitude) {

    console.log("GPS:", {lat, lng, acc, speed, bearing, altitude});

    // 1) Обновяваме маркера на картата в реално време
    if (typeof updateCarPositionFromWebView === "function") {
        updateCarPositionFromWebView(parseFloat(lat), parseFloat(lng));
    }

    // 2) Запис в MySQL
    $.post("includes/log_gps.php", {
        lat: lat,
        lng: lng,
        accuracy: acc,
        speed: speed,
        bearing: bearing,
        altitude: altitude
    });
}

// Автоматично на всеки 5 секунди
setInterval(requestGPS, 5000);
