function requestGPS() {
    if (typeof Android !== "undefined") {
        Android.requestGPS();
    }
}

// Android callback → получаваме всички данни
function receiveGPS(lat, lng, acc, speed, bearing, altitude) {

    console.log("GPS:", {lat, lng, acc, speed, bearing, altitude});

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
