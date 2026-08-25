/* ================================================
   CENTRE DE COMANDAMENT ESPACIAL — LÒGICA COMPARTIDA
   Fitxer únic reutilitzat per la versió d'escriptori i la d'iPhone.
   ================================================ */

let currentLat = 41.3879;
let currentLon = 2.1699;

const daysCa = ['DIU', 'DILL', 'DIM', 'DIMC', 'DIJ', 'DIV', 'DISS'];
const monthsCa = ['JAN', 'FEB', 'MAR', 'ABR', 'MAIG', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DES'];

function formatCoord(value, posLabel, negLabel) {
    const abs = Math.abs(value).toFixed(2);
    return `${abs}° ${value >= 0 ? posLabel : negLabel}`;
}

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    document.getElementById('time-val').innerText = `${h}:${m}:${s}`;

    const dayName = daysCa[now.getDay()];
    const dayNum = String(now.getDate()).padStart(2, '0');
    const monthName = monthsCa[now.getMonth()];

    document.getElementById('date-val').innerText = `${dayName} ${dayNum} ${monthName}`;

    const secondsProgress = (now.getSeconds() / 60) * 100;
    document.getElementById('time-meter').style.width = `${secondsProgress}%`;
}
setInterval(updateClock, 1000);
updateClock();

function updateLocationData() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            currentLat = position.coords.latitude;
            currentLon = position.coords.longitude;
            const alt = position.coords.altitude;

            const latText = formatCoord(currentLat, 'N', 'S');
            const lonText = formatCoord(currentLon, 'E', 'W');

            document.getElementById('earth-coords').innerText = `${latText}, ${lonText}`;
            document.getElementById('location-name').innerText = `LAT: ${latText} | LON: ${lonText}`;

            // Reverse geocoding via BigDataCloud (sense clau, límits generosos, suport de català)
            try {
                const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${currentLat}&longitude=${currentLon}&localityLanguage=ca`;
                const geoResponse = await fetch(geoUrl);
                const geoData = await geoResponse.json();
                const town = geoData.city || geoData.locality || geoData.principalSubdivision;
                if (town) {
                    document.getElementById('earth-card-title').innerText = town.toUpperCase();
                }
            } catch (e) {
                console.log("No s'ha pogut obtenir la població.");
            }

            // Altitud: molts dispositius (portàtils, alguns mòbils) no retornen mai aquest valor
            if (alt !== null && alt !== undefined) {
                document.getElementById('alt-val').innerText = Math.round(alt);
                document.getElementById('alt-status').innerText = "SENSOR GPS";
                // Escala pensada per a rangs 0–2000m (abans saturava a 500m)
                document.getElementById('alt-meter').style.width = `${Math.min(Math.max(alt, 0) / 20, 100)}%`;
            } else {
                document.getElementById('alt-val').innerText = "N/D";
                document.getElementById('alt-status').innerText = "SENSE DADA D'ALTITUD";
                document.getElementById('alt-meter').style.width = `0%`;
            }

            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&current=temperature_2m,relative_humidity_2m&models=best_match`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.current) {
                    const hum = Math.round(data.current.relative_humidity_2m);
                    document.getElementById('hum-val').innerText = hum;
                    document.getElementById('hum-meter').style.width = `${hum}%`;

                    const temp = data.current.temperature_2m;
                    document.getElementById('temp-val').innerText = temp.toFixed(1);
                    document.getElementById('temp-meter').style.width = `${Math.min(Math.max((temp + 10) * 2, 0), 100)}%`;
                    document.getElementById('temp-status').innerText = "METEO EN DIRECTE";
                }
            } catch (e) {
                console.log("Error carregant dades meteo.");
            }

            updateEarthOrientation();
            updateEarthSolarLighting();
        });
    }
}

updateLocationData();
setInterval(updateLocationData, 300000);

/* THREE.JS PLANET RENDERERS */
/* Textures servides via jsdelivr (mirall CDN de three.js), més fiable que raw.githubusercontent.com */
const textureLoader = new THREE.TextureLoader();
const TEX_BASE = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/';
const earthMapUrl = TEX_BASE + 'earth_atmos_2048.jpg';
const earthNightMapUrl = TEX_BASE + 'earth_lights_2048.jpg';
const earthSpecularUrl = TEX_BASE + 'earth_specular_2048.jpg';
const earthNormalUrl = TEX_BASE + 'earth_normal_2048.jpg';
const moonMapUrl = TEX_BASE + 'moon_1024.jpg';

/* EARTH RENDER */
const earthContainer = document.getElementById('earth-canvas-container');
const earthScene = new THREE.Scene();
const earthCamera = new THREE.PerspectiveCamera(45, earthContainer.clientWidth / earthContainer.clientHeight, 0.1, 1000);
const earthRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

earthRenderer.setSize(earthContainer.clientWidth, earthContainer.clientHeight);
earthRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
earthContainer.appendChild(earthRenderer.domElement);

const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load(earthMapUrl),
    emissiveMap: textureLoader.load(earthNightMapUrl),
    emissive: new THREE.Color(0xfff8d0),
    emissiveIntensity: 0.5,
    specularMap: textureLoader.load(earthSpecularUrl),
    normalMap: textureLoader.load(earthNormalUrl),
    specular: new THREE.Color(0x333333),
    shininess: 15
});

const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthScene.add(earthMesh);

function updateEarthOrientation() {
    const latRad = currentLat * (Math.PI / 180);
    const lonRad = currentLon * (Math.PI / 180);

    // Formulació matemàtica corregida per a centrar Europa / Ibèria (Greenwich)
    earthMesh.rotation.y = lonRad - Math.PI / 2;
    earthMesh.rotation.x = latRad;
}
updateEarthOrientation();

earthCamera.position.z = 5.0;

const earthSunLight = new THREE.DirectionalLight(0xffffff, 2.8);
earthScene.add(earthSunLight);

const earthAmbient = new THREE.AmbientLight(0x405575, 0.45);
earthScene.add(earthAmbient);

function updateEarthSolarLighting() {
    const now = new Date();

    const startOfYear = new Date(now.getUTCFullYear(), 0, 0);
    const diff = now - startOfYear;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    const solarDeclination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10)) * (Math.PI / 180);

    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    const sunLon = -((utcHours - 12) / 24) * Math.PI * 2;

    const lonRad = currentLon * (Math.PI / 180);
    const relAngle = sunLon - lonRad;
    const dist = 20;

    earthSunLight.position.set(
        Math.sin(relAngle) * dist * Math.cos(solarDeclination),
        Math.sin(solarDeclination) * dist,
        Math.cos(relAngle) * dist * Math.cos(solarDeclination)
    );
}
updateEarthSolarLighting();
setInterval(updateEarthSolarLighting, 30000);

/* MOON RENDER */
const moonContainer = document.getElementById('moon-canvas-container');
const moonScene = new THREE.Scene();
const moonCamera = new THREE.PerspectiveCamera(45, moonContainer.clientWidth / moonContainer.clientHeight, 0.1, 1000);
const moonRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

moonRenderer.setSize(moonContainer.clientWidth, moonContainer.clientHeight);
moonRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
moonContainer.appendChild(moonRenderer.domElement);

const moonGeometry = new THREE.SphereGeometry(2, 64, 64);
const moonMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load(moonMapUrl),
    shininess: 0
});

const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
moonScene.add(moonMesh);

moonCamera.position.z = 5.0;

const moonSunLight = new THREE.DirectionalLight(0xffffff, 2.5);
moonScene.add(moonSunLight);

const moonAmbient = new THREE.AmbientLight(0x202035, 0.35);
moonScene.add(moonAmbient);

moonMesh.rotation.y = 0;

function updateMoonPhase() {
    const now = new Date();
    const knownNewMoon = new Date(Date.UTC(2026, 0, 18, 19, 57));
    const diffDays = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
    const phaseFraction = (diffDays % 29.53059) / 29.53059;

    const illuminatedPercent = (0.5 * (1 - Math.cos(phaseFraction * Math.PI * 2))) * 100;

    const angle = (phaseFraction * Math.PI * 2) - Math.PI / 2;
    const dist = 12;

    moonSunLight.position.set(
        Math.cos(angle) * dist,
        0.2,
        Math.sin(angle) * dist
    );

    document.getElementById('moon-percent-text').innerText = `${illuminatedPercent.toFixed(1)}%`;

    let phaseText = "GIBOSA CREIXENT";
    if (phaseFraction < 0.03 || phaseFraction > 0.97) phaseText = "LLUNA NOVA";
    else if (phaseFraction < 0.22) phaseText = "CREIXENT";
    else if (phaseFraction < 0.28) phaseText = "QUART CREIXENT";
    else if (phaseFraction < 0.47) phaseText = "GIBOSA CREIXENT";
    else if (phaseFraction < 0.53) phaseText = "LLUNA PLENA";
    else if (phaseFraction < 0.72) phaseText = "GIBOSA MINVANT";
    else if (phaseFraction < 0.78) phaseText = "QUART MINVANT";
    else phaseText = "MINVANT";

    document.getElementById('moon-phase-name').innerText = phaseText;
}

updateMoonPhase();
setInterval(updateMoonPhase, 3600000);

function handleResize() {
    const eW = earthContainer.clientWidth;
    const eH = earthContainer.clientHeight;
    if (eW && eH) {
        earthCamera.aspect = eW / eH;
        earthCamera.updateProjectionMatrix();
        earthRenderer.setSize(eW, eH);
    }

    const mW = moonContainer.clientWidth;
    const mH = moonContainer.clientHeight;
    if (mW && mH) {
        moonCamera.aspect = mW / mH;
        moonCamera.updateProjectionMatrix();
        moonRenderer.setSize(mW, mH);
    }
}

function animate() {
    requestAnimationFrame(animate);
    handleResize();
    earthRenderer.render(earthScene, earthCamera);
    moonRenderer.render(moonScene, moonCamera);
}
animate();

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 100);
});
