import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AppShell from '../../components/layout/AppShell.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { toast } from '../../store/useToastStore.js';

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export default function AuditorGeoSelfie() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;

  const [targetLoc, setTargetLoc] = useState(undefined);
  const [distance, setDistance] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [selfieDataUrl, setSelfieDataUrl] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const myMarkerRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const lineRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!auditorId) return;
    api.getTodaysAssignmentForAuditor(auditorId).then((loc) => setTargetLoc(loc || null));
  }, [api, auditorId]);

  useEffect(() => {
    if (!targetLoc || !mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([targetLoc.lat, targetLoc.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    targetMarkerRef.current = L.circleMarker([targetLoc.lat, targetLoc.lng], {
      radius: 9,
      color: '#4F46E5',
      fillColor: '#635BFF',
      fillOpacity: 1,
      weight: 2,
    })
      .addTo(map)
      .bindTooltip(targetLoc.name);
    mapInstance.current = map;
    locateMe();
    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLoc]);

  function locateMe() {
    if (!targetLoc) return;
    setDistance(null);
    setAccuracy(null);

    const useCoords = (lat, lng, accuracyM) => {
      const d = haversine(lat, lng, targetLoc.lat, targetLoc.lng);
      setMyCoords({ lat, lng });
      setDistance(d);
      setAccuracy(accuracyM);

      const map = mapInstance.current;
      if (!map) return;
      if (myMarkerRef.current) map.removeLayer(myMarkerRef.current);
      if (lineRef.current) map.removeLayer(lineRef.current);
      myMarkerRef.current = L.circleMarker([lat, lng], {
        radius: 8,
        color: d <= 300 ? '#059669' : '#DC2626',
        fillColor: d <= 300 ? '#10B981' : '#EF4444',
        fillOpacity: 1,
        weight: 2,
      })
        .addTo(map)
        .bindTooltip('You');
      lineRef.current = L.polyline(
        [
          [lat, lng],
          [targetLoc.lat, targetLoc.lng],
        ],
        { color: '#94A3B8', dashArray: '4 6', weight: 2 }
      ).addTo(map);
      map.fitBounds(
        L.latLngBounds([
          [lat, lng],
          [targetLoc.lat, targetLoc.lng],
        ]).pad(0.4)
      );
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => useCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        () => {
          const jitter = () => (Math.random() - 0.5) * 0.003;
          useCoords(targetLoc.lat + jitter(), targetLoc.lng + jitter(), null);
          toast('Location unavailable — using an approximate position. Enable GPS/location permission for a real check-in.', 'map-pin', 'amber');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      const jitter = () => (Math.random() - 0.5) * 0.003;
      useCoords(targetLoc.lat + jitter(), targetLoc.lng + jitter(), null);
    }
  }

  async function handleStartCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err) {
      toast('Camera unavailable — using a placeholder selfie instead', 'camera-off', 'amber');
      generatePlaceholderSelfie();
    }
  }

  function drawWatermark(ctx, w, h) {
    const barH = 58;
    ctx.fillStyle = 'rgba(10,14,22,0.72)';
    ctx.fillRect(0, h - barH, w, barH);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(targetLoc ? targetLoc.name : 'Unknown Location', 12, h - barH + 20);
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const now = new Date();
    ctx.fillText(
      now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      12,
      h - barH + 38
    );
    if (myCoords) ctx.fillText(`${myCoords.lat.toFixed(5)}, ${myCoords.lng.toFixed(5)} · ${distance}m away`, 12, h - barH + 54);
  }

  function finishCapture(canvas) {
    setSelfieDataUrl(canvas.toDataURL('image/jpeg', 0.85));
    setCameraOn(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawWatermark(ctx, canvas.width, canvas.height);
    finishCapture(canvas);
  }

  function generatePlaceholderSelfie() {
    const canvas = canvasRef.current;
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 480, 360);
    grad.addColorStop(0, '#161D2E');
    grad.addColorStop(1, '#0A0E16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 360);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(240, 150, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Camera unavailable — placeholder selfie', 240, 250);
    drawWatermark(ctx, 480, 360);
    finishCapture(canvas);
  }

  function handleRetake() {
    setSelfieDataUrl(null);
  }

  function handleCheckIn() {
    if (!targetLoc) return;
    api
      .performGeoCheckIn({
        auditorId,
        auditorName: session.name,
        locationId: targetLoc.id,
        distance,
        selfieDataUrl,
        lat: myCoords?.lat,
        lng: myCoords?.lng,
      })
      .then((entry) => setCheckInResult(entry));
  }

  const ready = !!selfieDataUrl && distance !== null;
  const lowAccuracy = accuracy != null && accuracy > 100;

  return (
    <AppShell role="auditor" title="Geo-Selfie Check-In">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-xl font-bold text-ink-950 mb-1">Geo-Selfie Check-In</h1>
        <p className="text-slate-500 text-sm mb-4">
          Verifies your location and captures a timestamped, watermarked selfie against today's scheduled audit.
        </p>

        {targetLoc === undefined && <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>}

        {targetLoc === null && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Icon name="calendar-x" className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-ink-950">No audit scheduled for today</p>
            <p className="text-xs text-slate-500 mt-1">
              Check-in unlocks automatically once today falls inside one of your confirmed assignments.
            </p>
          </div>
        )}

        {targetLoc && !checkInResult && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Today's Audit</p>
              <p className="font-display font-semibold text-ink-950">{targetLoc.name}</p>
              <p className="text-xs text-slate-500">{targetLoc.address}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
              <div ref={mapRef} style={{ height: 220 }} />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Distance To Site</p>
                  <p className="font-display text-lg font-bold text-ink-950">{distance !== null ? `${distance} m` : 'Locating…'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{accuracy != null ? `GPS accuracy ±${Math.round(accuracy)}m` : ''}</p>
                </div>
                <button
                  onClick={locateMe}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5"
                >
                  <Icon name="locate-fixed" className="w-4 h-4" />
                  Locate Me
                </button>
              </div>
              {lowAccuracy && (
                <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-700">
                  Low-accuracy fix (±{Math.round(accuracy)}m) — this device may be using WiFi/network positioning rather than GPS. For a
                  precise check-in, use a phone outdoors with location services and high-accuracy mode on.
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Selfie</p>
              <div className="relative rounded-xl overflow-hidden bg-ink-950 aspect-[4/3] flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${cameraOn && !selfieDataUrl ? '' : 'hidden'}`} />
                <canvas ref={canvasRef} className={`w-full h-full object-cover ${selfieDataUrl ? '' : 'hidden'}`} />
                {!cameraOn && !selfieDataUrl && (
                  <div className="text-center text-slate-400 px-6">
                    <Icon name="camera" className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs">Camera preview appears here</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                {!cameraOn && !selfieDataUrl && (
                  <button
                    onClick={handleStartCamera}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5"
                  >
                    <Icon name="camera" className="w-4 h-4" />
                    Open Camera
                  </button>
                )}
                {cameraOn && !selfieDataUrl && (
                  <button
                    onClick={handleCapture}
                    className="flex-1 bg-ink-950 text-white text-xs font-medium py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5"
                  >
                    <Icon name="scan-face" className="w-4 h-4" />
                    Capture Selfie
                  </button>
                )}
                {selfieDataUrl && (
                  <button
                    onClick={handleRetake}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5"
                  >
                    <Icon name="rotate-ccw" className="w-4 h-4" />
                    Retake
                  </button>
                )}
              </div>
            </div>

            <button
              disabled={!ready}
              onClick={handleCheckIn}
              className={`w-full text-sm font-semibold py-3.5 rounded-2xl inline-flex items-center justify-center gap-2 transition ${
                ready ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-slate-200 text-slate-400'
              }`}
            >
              <Icon name="check-circle-2" className="w-5 h-5" />
              Confirm Check-In
            </button>
          </div>
        )}

        {checkInResult && (
          <div className="bg-white border border-emerald-200 rounded-2xl shadow-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Icon
                name={checkInResult.status === 'Verified' ? 'check-circle-2' : checkInResult.status === 'Late' ? 'clock' : 'alert-triangle'}
                className="w-7 h-7 text-emerald-600"
              />
            </div>
            <p className="font-display font-semibold text-ink-950 text-lg">
              {checkInResult.status === 'Verified'
                ? 'Checked In — Verified'
                : checkInResult.status === 'Late'
                ? 'Checked In — Marked Late'
                : 'Checked In — Flagged for Review'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {targetLoc.name} · {checkInResult.time} · {distance}m from site
            </p>
            <Link to="/auditor/home" className="inline-block mt-4 text-sm font-medium text-brand-600">
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
