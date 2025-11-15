// js/alarms.js (full patched version)

// === alarms.js ===

// --- Глобални променливи ---
let alarmSound = null;
let alarmActive = false;
let soundEnabled = true; // звукът по подразбиране е активен
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

// --- Извикване на Android метод ---
function callAndroidSound(state) {
    try {
        if (typeof Android !== 'undefined' && typeof Android.playSoundAlarm === 'function') {
            Android.playSoundAlarm(state);
        } else if (typeof playSoundAlarm === 'function') {
            playSoundAlarm(state);
        } else {
            console.warn('⚠️ Няма Android метод за звук.');
        }
    } catch (err) {
        console.error('❌ Android звук грешка:', err);
    }
}

// --- Инициализация на звука за браузър ---
function initBrowserSound() {
    if (!alarmSound) {
        alarmSound = new Audio('sounds/alarm.mp3');
        alarmSound.loop = true;
        console.log('🔊 Инициализация на звук.');
    }
}

// --- Разрешаване на звука при първо взаимодействие (браузър) ---
if (isDesktopBrowser) {
    document.addEventListener('click', initBrowserSound, { once: true });
    document.addEventListener('keydown', initBrowserSound, { once: true });
}

// --- Показване на визуален индикатор ---
function showAlarmIndicator() {
    let el = document.getElementById('alarmIndicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'alarmIndicator';
        el.innerHTML = `
            <div style="
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
            ">🚨</div>
        `;
        document.body.appendChild(el);

        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.6; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    el.classList.add('active');
    alarmActive = true;
}

// --- Скриване на индикатора ---
function hideAlarmIndicator() {
    const el = document.getElementById('alarmIndicator');
    if (el) el.remove();
    alarmActive = false;
}

// --- Стартиране на аларма ---
function triggerAlarmSound() {
    if (!soundEnabled) return;
    showAlarmIndicator();

    if (isAndroidWebView) {
        callAndroidSound(1);
    } else if (alarmSound) {
        alarmSound.play().catch(err => console.warn('🔇 Play error:', err));
    }
}

// --- Спиране на аларма ---
function stopAlarmSound() {
    hideAlarmIndicator();

    if (isAndroidWebView) {
        callAndroidSound(0);
    } else if (alarmSound && !alarmSound.paused) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
}

// --- Обновяване на алармите ---
function updateAlarms(data) {
    $('#alarmPanel').html(data);

    const hasActiveAlarm = $('#alarmPanel .bg-danger, #alarmPanel .alarm-new').length > 0;

    if (hasActiveAlarm && !alarmActive) {
        triggerAlarmSound();
    } else if (!hasActiveAlarm && alarmActive) {
        stopAlarmSound();
    }
}

// --- Избор на аларма (зареждане в main-content) ---
function selectAlarm(aID, oName) {
    // Визуален ефект при избор
    $('#alarmPanel li').removeClass('active');
    $('#alarm-' + aID).addClass('active');

    // Зареждане на съдържанието в main-content
    $('.main-content').html(`
        <div class="text-center py-5 text-muted">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>Зареждане на данните за ${oName}...
        </div>
    `);

    $.ajax({
        url: 'system/alarms_info.php',
        method: 'GET',
        data: { aID: aID },
        success: function (html) {
            $('.main-content').html(html);
            stopAlarmSound();
        },
        error: function () {
            $('.main-content').html(`
                <div class="alert alert-danger m-3">
                    ⚠️ Възникна грешка при зареждане на информацията за алармата.
                </div>
            `);
        }
    });
}

// --- Ръчен бутон за звук ---
$(document).ready(function () {
    $('#toggleSoundBtn').on('click', function () {
        soundEnabled = !soundEnabled;
        const icon = soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark';
        const text = soundEnabled ? 'Звук: Вкл.' : 'Звук: Изкл.';

        $(this).html(`<i class="fa-solid ${icon} me-1"></i> ${text}`);

        if (!soundEnabled && alarmActive) stopAlarmSound();
    });
});

// =========================
// Архивна секция под картата
// =========================
let archiveInterval = null;
let lastArchiveUpdate = null;
let archiveParams = {};

function toggleArchiveSection(oRec, sID, oNum, zTime) {
    const section = document.getElementById('archiveSection');

    if (section.style.display === 'none') {
        section.style.display = 'block';
        archiveParams = { oRec, sID, oNum, zTime };
        loadArchiveContent();

        archiveInterval = setInterval(() => {
            loadArchiveContent();
        }, 10000);

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

    statusIcon.classList.remove('text-danger');
    statusIcon.classList.add('text-warning');
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
        success: function (response) {
            content.innerHTML = response.trim()
                ? response
                : '<div class="text-center text-muted py-2">Няма архивни данни.</div>';
            lastArchiveUpdate = new Date();
            statusIcon.classList.remove('text-warning', 'text-danger');
            statusIcon.classList.add('text-success');
            updateArchiveTimer();
        },
        error: function () {
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

    const diff = Math.floor((new Date() - lastArchiveUpdate) / 1000);
    const secs = diff % 60;
    const mins = Math.floor(diff / 60);
    const timeStr = mins > 0
        ? `Обновено преди ${mins}м ${secs}с`
        : `Обновено преди ${secs}с`;

    statusText.textContent = `✓ ${timeStr}`;
}

function manualRefreshArchive() {
    loadArchiveContent();
}

// =========================
// Google Map + Car Visualization
// =========================
let map;
let objectMarker;
let carOverlay;
let carPosition = null;
let trailPolyline;
let trailPoints = [];
let trailMaxPoints = 500;
let heatmap;
let heatmapPoints = [];
let updateInterval;
let lastAnimation = null;

// --- Car Overlay class (HTML marker)
class CarOverlay extends google.maps.OverlayView {
    constructor(position, map, options = {}) {
        super();
        this.position = position;
        this.map = map;
        this.div = null;
        this.speed = options.speed || 0;
        this.bearing = options.bearing || 0;
        this.acc = options.acc || -1;
        this.altitude = options.altitude || null;
        this.setMap(map);
    }
    onAdd() {
        this.div = document.createElement('div');
        this.div.className = 'car-marker';

        const shadow = document.createElement('div');
        shadow.className = 'shadow';
        shadow.style.background = 'radial-gradient(circle at 30% 30%, rgba(0,0,0,0.4), rgba(0,0,0,0))';
        shadow.style.width = '48px';
        shadow.style.height = '48px';
        this.div.appendChild(shadow);

        const speedBadge = document.createElement('div');
        speedBadge.className = 'speed-badge';
        speedBadge.innerText = this.speed > 0 ? Math.round(this.speed*3.6)+' km/h' : '';
        this.div.appendChild(speedBadge);
        this.speedBadgeEl = speedBadge;

        const carSvg = document.createElement('div');
        carSvg.className = 'car-shape';
        carSvg.innerHTML = `
            <svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path d="M32 4 L44 24 L44 44 L20 44 L20 24 Z" fill="#2b8cff" stroke="#003a8c" stroke-width="1"/>
                <circle cx="24" cy="48" r="3" fill="#222" />
                <circle cx="40" cy="48" r="3" fill="#222" />
              </g>
            </svg>
        `;
        this.carSvgEl = carSvg;
        this.div.appendChild(carSvg);

        const panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(this.div);
    }
    draw() {
        if(!this.div) return;
        const projection = this.getProjection();
        if(!projection) return;
        const pos = projection.fromLatLngToDivPixel(this.position);
        if(!pos) return;
        this.div.style.left = (pos.x - 24) + 'px';
        this.div.style.top = (pos.y - 24) + 'px';
        this.div.style.transform = `rotate(${this.bearing}deg)`;
        if(this.speedBadgeEl){
            this.speedBadgeEl.innerText = this.speed>0 ? Math.round(this.speed*3.6)+' km/h':'';
        }
    }
    update(position, opts={}) {
        if(position) this.position = position;
        if(opts.speed!==undefined) this.speed = opts.speed;
        if(opts.bearing!==undefined) this.bearing = opts.bearing;
        if(opts.acc!==undefined) this.acc = opts.acc;
        if(opts.altitude!==undefined) this.altitude = opts.altitude;
        if(this.div) this.draw();
    }
    onRemove() {
        if(this.div && this.div.parentNode){
            this.div.parentNode.removeChild(this.div);
            this.div = null;
        }
    }
}

// --- Modal events patch ---
const modalMapEl = document.getElementById('modalMap');
modalMapEl.addEventListener('hidden.bs.modal', () => {
    if(carOverlay){ carOverlay.setMap(null); carOverlay = null; }
    if(trailPolyline){ trailPolyline.setMap(null); trailPolyline = null; }
    if(heatmap){ heatmap.setMap(null); heatmap = null; }
    carPosition = null;
    trailPoints = [];
    heatmapPoints = [];
});

modalMapEl.addEventListener('shown.bs.modal', () => {
    if(window.__pendingMapInit){
        const {oLat,oLan,idUser} = window.__pendingMapInit;
        initMap(oLat,oLan,idUser);
        window.__pendingMapInit = null;
    }
});

// --- Open Map Modal ---
function openMapModal(modalId, oLat, oLan, idUser) {

    const modalEl = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const containerId = "mapContainer_" + modalId.replace("modalMap", "");

    // Изчакваме Bootstrap да отвори модала (важно!)
    setTimeout(() => {
        initMapUnique(containerId, oLat, oLan, idUser);
    }, 350);
}

function initMapUnique(containerId, oLat, oLan, idUser) {

    console.log("Init map in container:", containerId);

    const element = document.getElementById(containerId);
    if (!element) {
        console.error("Missing map container:", containerId);
        return;
    }

    // stop using shared map / shared overlay
    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };

    const mapInstance = new google.maps.Map(element, {
        center: objectPos,
        zoom: 14,
        mapId: "INTELLI_MAP_ID",
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        gestureHandling: "greedy"
    });

    new google.maps.Marker({
        position: objectPos,
        map: mapInstance,
        title: "Обект",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
    });

    // Взимаме текущата GPS позиция ако е налична
    if (window.__lastGps) {
        new google.maps.Marker({
            position: {
                lat: parseFloat(window.__lastGps.lat),
                lng: parseFloat(window.__lastGps.lng)
            },
            map: mapInstance,
            title: "Автомобил",
            icon: { url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png" }
        });
    }
}


// --- initMap ---
function initMap(oLat,oLan,idUser){
    const objectPos={lat:parseFloat(oLat),lng:parseFloat(oLan)};
    if(!map){
        map=new google.maps.Map(document.getElementById('mapContainer'),{
            center:objectPos,
            zoom:14,
            mapId:"INTELLI_MAP_ID",
            mapTypeId:google.maps.MapTypeId.ROADMAP,
            gestureHandling:'greedy'
        });
    } else {
        google.maps.event.trigger(map,'resize');
        map.setCenter(objectPos);
    }

    if(!objectMarker){
        objectMarker=new google.maps.Marker({
            position:objectPos,
            map:map,
            title:"Обект",
            icon:{url:"https://maps.google.com/mapfiles/kml/paddle/home.png"}
        });
    } else {
        objectMarker.setPosition(objectPos);
    }

    if(!trailPolyline){
        trailPolyline=new google.maps.Polyline({map:map,path:[],geodesic:true,strokeColor:"#00b300",strokeOpacity:0.9,strokeWeight:4});
    }

    if(!heatmap){
        heatmap=new google.maps.visualization.HeatmapLayer({data:[],radius:30,dissipating:true,opacity:0.7,map:map});
    }

    if(!carOverlay || carOverlay.getMap()!==map){
        carOverlay=new CarOverlay(new google.maps.LatLng(objectPos.lat,objectPos.lng),map,{});
    } else {
        carOverlay.update(new google.maps.LatLng(objectPos.lat,objectPos.lng),{});
    }

    carPosition=new google.maps.LatLng(objectPos.lat,objectPos.lng);

    clearInterval(updateInterval);
    updateInterval=setInterval(()=>updateCarPositionFallback(idUser),10000);
    updateCarPositionFallback(idUser);
}

// --- Fallback AJAX position ---
function updateCarPositionFallback(idUser){
    $.ajax({
        url:'system/get_geo_position.php',
        method:'GET',
        data:{idUser:idUser},
        success:function(resp){
            if(!resp) return;
            try{
                const [lat,lon]=resp.trim().split(',').map(parseFloat);
                updateCarFromWebView(lat,lon,0,0,-1);
            }catch(e){ console.warn('Fallback position error',e); }
        },
        error:function(){ console.error('Fallback position AJAX error'); }
    });
}

// --- Main entry for WebView updates ---
window.updateCarFromWebView=function(lat,lng,speed,bearing,acc,altitude){
    if(!map){ window.__lastGps={lat,lng,speed,bearing,acc,altitude,ts:Date.now()}; return; }

    const newPos=new google.maps.LatLng(lat,lng);

    trailPoints.push(newPos); heatmapPoints.push(newPos);
    if(trailPoints.length>trailMaxPoints) trailPoints.shift();
    if(heatmapPoints.length>trailMaxPoints) heatmapPoints.shift();

    trailPolyline.setPath(trailPoints);
    heatmap.setData(heatmapPoints);

    if(!carPosition){
        carOverlay.update(newPos,{speed:speed,bearing:bearing,acc:acc,altitude:altitude});
        carPosition=newPos;
        fitMapToMarkers();
        return;
    }

    const distanceMeters=haversineDistance(carPosition.lat(),carPosition.lng(),newPos.lat(),newPos.lng());
    if(distanceMeters<1){
        carOverlay.update(newPos,{speed:speed,bearing:bearing,acc:acc,altitude:altitude});
        carPosition=newPos;
        return;
    }

    const duration=Math.max(400,Math.min(3000,(distanceMeters/10)*200));
    if(lastAnimation && lastAnimation.cancel) lastAnimation.cancel();

    const start={lat:carPosition.lat(),lng:carPosition.lng()};
    const end={lat:newPos.lat(),lng:newPos.lng()};
    const startTime=performance.now();
    let cancelled=false;
    lastAnimation={cancel:()=>{cancelled=true;}};

    function step(now){
        if(cancelled) return;
        const elapsed=now-startTime;
        const t=Math.min(1,elapsed/duration);
        const tt=t<0.5?2*t*t:-1+(4-2*t)*t;
        const curLat=start.lat+(end.lat-start.lat)*tt;
        const curLng=start.lng+(end.lng-start.lng)*tt;
        const curPos=new google.maps.LatLng(curLat,curLng);
        const curBearing=interpolateBearing(carOverlay.bearing||0,bearing,tt);
        carOverlay.update(curPos,{speed:speed,bearing:curBearing,acc:acc,altitude:altitude});
        if(t<1) requestAnimationFrame(step);
        else {
            carPosition=newPos;
            carOverlay.update(newPos,{speed:speed,bearing:bearing,acc:acc,altitude:altitude});
            fitMapToMarkers();
        }
    }
    requestAnimationFrame(step);
};

function fitMapToMarkers(){
    if(!map || !objectMarker || !carOverlay) return;
    const bounds=new google.maps.LatLngBounds();
    bounds.extend(objectMarker.getPosition());
    bounds.extend(carOverlay.position);
    map.fitBounds(bounds);
}

// --- Вспомогателни функции ---
function haversineDistance(lat1,lon1,lat2,lon2){
    const R=6371000;
    const toRad=(x)=>x*Math.PI/180;
    const dLat=toRad(lat2-lat1);
    const dLon=toRad(lon2-lon1);
    const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    return R*c;
}

function interpolateBearing(b1,b2,t){
    let diff=b2-b1;
    if(diff>180) diff-=360;
    if(diff<-180) diff+=360;
    return b1+diff*t;
}