// js/alarms.js (patched full version)

// === alarms.js ===

// --- Глобални променливи ---
let alarmSound = null;
let alarmActive = false;
let soundEnabled = true;
let isAndroidWebView = false;
let isDesktopBrowser = false;

// --- Засичане на платформата ---
function detectEnvironment() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/Android/i.test(ua) && /wv/.test(ua)) {
        isAndroidWebView = true;
        console.log('📱 Android WebView');
    } else {
        isDesktopBrowser = true;
        console.log('💻 Desktop/Browser');
    }
}
detectEnvironment();

// --- Android звук ---
function callAndroidSound(state) {
    try {
        if (typeof Android !== 'undefined' && typeof Android.playSoundAlarm === 'function') {
            Android.playSoundAlarm(state);
        } else if (typeof playSoundAlarm === 'function') {
            playSoundAlarm(state);
        } else console.warn('⚠️ Няма Android метод за звук.');
    } catch (err) {
        console.error('❌ Android звук грешка:', err);
    }
}

// --- Инициализация на браузърен звук ---
function initBrowserSound() {
    if (!alarmSound) {
        alarmSound = new Audio('sounds/alarm.mp3');
        alarmSound.loop = true;
        console.log('🔊 Инициализация на звук.');
    }
}

if (isDesktopBrowser) {
    document.addEventListener('click', initBrowserSound, { once: true });
    document.addEventListener('keydown', initBrowserSound, { once: true });
}

// --- Визуален индикатор ---
function showAlarmIndicator() {
    let el = document.getElementById('alarmIndicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'alarmIndicator';
        el.innerHTML = `<div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: red;
                color: white;
                font-size: 2rem;
                border-radius: 50%;
                width: 70px;
                height: 70px;
                display: flex;
                justify-content: center;
                align-items: center;
                box-shadow: 0 0 20px red;
                z-index: 9999;
                animation: pulse 1s infinite;
            ">🚨</div>`;
        document.body.appendChild(el);

        const style = document.createElement('style');
        style.innerHTML = `@keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.6; }
                100% { transform: scale(1); opacity: 1; }
            }`;
        document.head.appendChild(style);
    }
    el.classList.add('active');
    alarmActive = true;
}

function hideAlarmIndicator() {
    const el = document.getElementById('alarmIndicator');
    if (el) el.remove();
    alarmActive = false;
}

// --- Стартиране и спиране на аларма ---
function triggerAlarmSound() {
    if (!soundEnabled) return;
    showAlarmIndicator();
    if (isAndroidWebView) callAndroidSound(1);
    else if (alarmSound) alarmSound.play().catch(err => console.warn('🔇 Play error:', err));
}

function stopAlarmSound() {
    hideAlarmIndicator();
    if (isAndroidWebView) callAndroidSound(0);
    else if (alarmSound && !alarmSound.paused) { alarmSound.pause(); alarmSound.currentTime = 0; }
}

// --- Update на панела с аларми ---
function updateAlarms(data) {
    $('#alarmPanel').html(data);
    const hasActiveAlarm = $('#alarmPanel .bg-danger, #alarmPanel .alarm-new').length > 0;
    if (hasActiveAlarm && !alarmActive) triggerAlarmSound();
    else if (!hasActiveAlarm && alarmActive) stopAlarmSound();
}

// --- Избор на аларма ---
function selectAlarm(aID, oName) {
    $('#alarmPanel li').removeClass('active');
    $('#alarm-' + aID).addClass('active');

    $('.main-content').html(`
        <div class="text-center py-5 text-muted">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>Зареждане на данните за ${oName}...
        </div>
    `);

    $.ajax({
        url: 'system/alarms_info.php',
        method: 'GET',
        data: { aID: aID },
        success: function(html) {
            $('.main-content').html(html);
            stopAlarmSound();
        },
        error: function() {
            $('.main-content').html(`
                <div class="alert alert-danger m-3">
                    ⚠️ Възникна грешка при зареждане на информацията за алармата.
                </div>
            `);
        }
    });
}

// --- Архивна секция ---
let archiveInterval = null;
let lastArchiveUpdate = null;
let archiveParams = {};

function toggleArchiveSection(oRec, sID, oNum, zTime) {
    const section = document.getElementById('archiveSection');
    if (section.style.display === 'none') {
        section.style.display = 'block';
        archiveParams = { oRec, sID, oNum, zTime };
        loadArchiveContent();
        archiveInterval = setInterval(loadArchiveContent, 10000);
        setInterval(updateArchiveTimer, 1000);
    } else {
        section.style.display = 'none';
        clearInterval(archiveInterval);
    }
}

function loadArchiveContent() {
    const content = document.getElementById('archiveContent');
    const statusText = document.getElementById('archiveStatusText');
    const statusIcon = document.getElementById('archiveStatusIcon');
    statusIcon.classList.remove('text-danger'); statusIcon.classList.add('text-warning');
    statusText.textContent = 'Обновяване...';

    $.ajax({
        url: 'system/get_object_archiv.php',
        method: 'GET',
        data: {
            oRec: archiveParams.oRec,
            sID: archiveParams.sID,
            oNum: archiveParams.oNum,
            zTime: archiveParams.zTime,
            listSize: 720,
            listLimit: 20
        },
        success: function(response) {
            content.innerHTML = response.trim() ? response : '<div class="text-center text-muted py-2">Няма архивни данни.</div>';
            lastArchiveUpdate = new Date();
            statusIcon.classList.remove('text-warning', 'text-danger');
            statusIcon.classList.add('text-success');
            updateArchiveTimer();
        },
        error: function() {
            content.innerHTML = '<div class="text-center text-danger py-2">Грешка при зареждане на архива.</div>';
            statusIcon.classList.remove('text-success', 'text-warning');
            statusIcon.classList.add('text-danger');
            statusText.textContent = 'Грешка при обновяване';
        }
    });
}

function updateArchiveTimer() {
    const statusText = document.getElementById('archiveStatusText');
    if (!lastArchiveUpdate) return;
    const diff = Math.floor((new Date() - lastArchiveUpdate)/1000);
    const secs = diff % 60;
    const mins = Math.floor(diff/60);
    const timeStr = mins > 0 ? `Обновено преди ${mins}м ${secs}с` : `Обновено преди ${secs}с`;
    statusText.textContent = `✓ ${timeStr}`;
}

function manualRefreshArchive() { loadArchiveContent(); }

// === Google Maps vars ===
let map, objectMarker, carOverlay, carPosition = null, trailPolyline, trailPoints=[], trailMaxPoints=500;
let heatmap, heatmapPoints=[], updateInterval, lastAnimation=null;

// === CarOverlay class with projection protection (patched) ===
class CarOverlay extends google.maps.OverlayView {
    constructor(position, map, options={}) { super(); this.position=position; this.map=map; this.div=null; this.speed=options.speed||0; this.bearing=options.bearing||0; this.acc=options.acc||-1; this.altitude=options.altitude||null; this.setMap(map); }
    onAdd() {
        this.div = document.createElement('div'); this.div.className='car-marker';
        const shadow = document.createElement('div'); shadow.className='shadow';
        shadow.style.background='radial-gradient(circle at 30% 30%, rgba(0,0,0,0.4), rgba(0,0,0,0))';
        shadow.style.width='48px'; shadow.style.height='48px'; this.div.appendChild(shadow);
        const speedBadge = document.createElement('div'); speedBadge.className='speed-badge';
        speedBadge.innerText = this.speed>0?Math.round(this.speed*3.6)+' km/h':'';
        this.div.appendChild(speedBadge); this.speedBadgeEl=speedBadge;
        const carSvg = document.createElement('div'); carSvg.className='car-shape';
        carSvg.innerHTML=`<svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
            <g>
              <path d="M32 4 L44 24 L44 44 L20 44 L20 24 Z" fill="#2b8cff" stroke="#003a8c" stroke-width="1"/>
              <circle cx="24" cy="48" r="3" fill="#222" />
              <circle cx="40" cy="48" r="3" fill="#222" />
            </g>
        </svg>`; this.carSvgEl=carSvg; this.div.appendChild(carSvg);
        const panes = this.getPanes(); panes.overlayMouseTarget.appendChild(this.div);
    }
    draw() {
        if (!this.div) return;
        const projection = this.getProjection();
        if (!projection || !projection.fromLatLngToDivPixel) { console.warn("Projection not ready", this.position); return; }
        const pos = projection.fromLatLngToDivPixel(this.position);
        if (!pos) return;
        this.div.style.left=(pos.x-24)+'px';
        this.div.style.top=(pos.y-24)+'px';
        this.div.style.transform=`rotate(${this.bearing}deg)`;
        if (this.speedBadgeEl) this.speedBadgeEl.innerText=this.speed>0?Math.round(this.speed*3.6)+' km/h':'';
    }
    update(position, opts={}) {
        if(position) this.position=position;
        if(opts.speed!==undefined) this.speed=opts.speed;
        if(opts.bearing!==undefined) this.bearing=opts.bearing;
        if(opts.acc!==undefined) this.acc=opts.acc;
        if(opts.altitude!==undefined) this.altitude=opts.altitude;
        if(this.div) this.draw();
    }
    onRemove() { if(this.div && this.div.parentNode){this.div.parentNode.removeChild(this.div); this.div=null;} }
}

// =========================
// 🗺️ Open map modal + initMap patch
// =========================
function openMapModal(oLat, oLan, idUser){
    const modal = new bootstrap.Modal(document.getElementById('modalMap'));
    modal.show();

    // изчакваме анимацията на модала
    setTimeout(() => {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) return;

        // принудително ресетваме размера на картата
        mapContainer.style.width = '100%';
        mapContainer.style.height = '500px';

        if (map) {
            // trigger resize, за да се обнови картата ако вече е инициализирана
            google.maps.event.trigger(map, 'resize');
        }

        initMap(oLat, oLan, idUser);
    }, 400);
}

function initMap(oLat, oLan, idUser){
    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };

    // ресет на overlay-и и трайл/heatmap, за да няма наслагване при друг обект
    if(carOverlay){ carOverlay.setMap(null); carOverlay = null; }
    carPosition = null;
    trailPoints = [];
    heatmapPoints = [];

    // инициализация на картата
    if(!map){
        map = new google.maps.Map(document.getElementById('mapContainer'), {
            center: objectPos,
            zoom: 14,
            mapId: "INTELLI_MAP_ID",
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            gestureHandling: 'greedy'
        });
    } else {
        map.setCenter(objectPos);
    }

    // marker за обекта
    if(!objectMarker){
        objectMarker = new google.maps.Marker({
            position: objectPos,
            map: map,
            title: "Обект",
            icon: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
        });
    } else {
        objectMarker.setPosition(objectPos);
    }

    // overlay за автомобила
    carOverlay = new CarOverlay(new google.maps.LatLng(objectPos.lat, objectPos.lng), map, {});

    // polyline за трайл
    if(!trailPolyline){
        trailPolyline = new google.maps.Polyline({
            map: map,
            path: [],
            geodesic: true,
            strokeColor: "#00b300",
            strokeOpacity: 0.9,
            strokeWeight: 4
        });
    } else {
        trailPolyline.setPath([]);
    }

    // heatmap layer
    if(!heatmap){
        heatmap = new google.maps.visualization.HeatmapLayer({
            data: [],
            radius: 30,
            dissipating: true,
            opacity: 0.7,
            map: map
        });
    } else {
        heatmap.setData([]);
    }

    // fallback обновяване на позицията на автомобила
    clearInterval(updateInterval);
    updateInterval = setInterval(() => updateCarPositionFallback(idUser), 10000);
    updateCarPositionFallback(idUser);
}

// --- Fallback AJAX ---
function updateCarPositionFallback(idUser){
    $.ajax({ url:'system/get_geo_position.php', method:'GET', data:{idUser:idUser}, success:function(response){
        if(!response) return;
        try{ const [lat,lon]=response.trim().split(',').map(parseFloat); updateCarFromWebView(lat,lon,0,0,-1); }
        catch(e){ console.warn('Грешка при fallback позиция:',e); }
    }, error:function(){ console.error('Грешка при извличане на позиция (fallback).'); }});
}

// --- WebView update ---
window.updateCarFromWebView=function(lat,lng,speed,bearing,acc,altitude){
    if(!map){ window.__lastGps={lat,lng,speed,bearing,acc,altitude,ts:Date.now()}; return; }
    const newPos=new google.maps.LatLng(lat,lng);
    trailPoints.push(newPos); heatmapPoints.push(newPos);
    if(trailPoints.length>trailMaxPoints) trailPoints.shift();
    if(heatmapPoints.length>trailMaxPoints) heatmapPoints.shift();
    trailPolyline.setPath(trailPoints); heatmap.setData(heatmapPoints);
    if(!carPosition){ carOverlay.update(newPos,{speed:speed,bearing:bearing,acc:acc,altitude:altitude}); carPosition=newPos; fitMapToMarkers(); return; }
    const distanceMeters=haversineDistance(carPosition.lat(),carPosition.lng(),newPos.lat(),newPos.lng());
    if(distanceMeters<1){ carOverlay.update(newPos,{speed:speed,bearing:bearing,acc:acc,altitude:altitude}); carPosition=newPos; return; }
    const duration=Math.max(400,Math.min(3000,(distanceMeters/10)*200));
    if(lastAnimation && lastAnimation.cancel) lastAnimation.cancel();
    const start={lat:carPosition.lat(),lng:carPosition.lng()}; const end={lat:newPos.lat(),lng:newPos.lng()};
    const startTime=performance.now(); let cancelled=false;
    lastAnimation={cancel:()=>{cancelled=true;}};
    function step(now){
        if(cancelled) return;
        const elapsed=now-startTime; const t=Math.min(1,elapsed/duration); const tt=t<0.5?2*t*t:-1+(4-2*t)*t;
        const curLat=start.lat+(end.lat-start.lat)*tt; const curLng=start.lng+(end.lng-start.lng)*tt; const curPos=new google.maps.LatLng(curLat,curLng);
        const curBearing=interpolateBearing(carOverlay.bearing||0,bearing,tt);
        carOverlay.update(curPos,{speed:speed,bearing:curBearing,acc:acc,altitude:altitude});
        if(t<1) requestAnimationFrame(step);
        else{ carPosition=newPos; carOverlay.update(newPos,{speed:speed,bearing:bearing,acc:acc,altitude:altitude}); fitMapToMarkers(); }
    }
    requestAnimationFrame(step);
};

// --- Map helpers ---
function fitMapToMarkers(){ if(!map||!objectMarker||!carPosition) return; const bounds=new google.maps.LatLngBounds(); bounds.extend(objectMarker.getPosition()); bounds.extend(carPosition); map.fitBounds(bounds,100); }
function haversineDistance(lat1,lon1,lat2,lon2){ function toRad(x){return x*Math.PI/180;} const R=6371000; const dLat=toRad(lat2-lat1); const dLon=toRad(lon2-lon1); const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2); const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); return R*c; }
function interpolateBearing(fromDeg,toDeg,t){ const diff=((((toDeg-fromDeg)%360)+540)%360)-180; return fromDeg+diff*t; }

// --- Clear trail ---
window.clearCarTrail=function(){ trailPoints=[]; heatmapPoints=[]; if(trailPolyline) trailPolyline.setPath([]); if(heatmap) heatmap.setData([]); };
