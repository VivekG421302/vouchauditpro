import { useEffect, useRef, useState } from 'react';
import * as ZXing from '@zxing/library';
import { Icon } from './Icon.jsx';

// open={true}/onClose/onDetect(code) — mirrors Scanner.open()'s single-shot
// behavior: fires onDetect once then the caller closes it.
export default function ScannerSheet({ open, onClose, onDetect, title = 'Scan Code', hint = 'Point the camera at a QR or barcode — any angle works' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const rotCanvasRef = useRef(document.createElement('canvas'));
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const timerRef = useRef(null);
  const busyRef = useRef(false);
  const [manualValue, setManualValue] = useState('');
  const [status, setStatus] = useState('unsupported'); // 'starting' | 'scanning' | 'unsupported'
  const [unsupportedMsg, setUnsupportedMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    startCamera();
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(value) {
    const v = String(value || '').trim();
    if (!v) return;
    stopCamera();
    onDetect?.(v);
  }

  async function startCamera() {
    setManualValue('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setUnsupportedMsg(
        location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname)
          ? "Camera scanning isn't available on this browser — enter the code manually below."
          : 'Camera access needs HTTPS (or localhost) — enter the code manually below.'
      );
      setStatus('unsupported');
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
    } catch (e) {
      setUnsupportedMsg('Camera access was denied or unavailable — enter the code manually below.');
      setStatus('unsupported');
      return;
    }
    setStatus('scanning');
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = streamRef.current;
    await video.play().catch(() => {});

    const hints = new Map();
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.QR_CODE,
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.CODE_128,
      ZXing.BarcodeFormat.CODE_39,
      ZXing.BarcodeFormat.CODE_93,
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.ITF,
      ZXing.BarcodeFormat.CODABAR,
      ZXing.BarcodeFormat.DATA_MATRIX,
      ZXing.BarcodeFormat.PDF_417,
      ZXing.BarcodeFormat.AZTEC,
    ]);
    readerRef.current = new ZXing.MultiFormatReader();
    readerRef.current.setHints(hints);
    timerRef.current = setInterval(() => tick(video), 160);
  }

  function tick(video) {
    if (busyRef.current || !streamRef.current || !video.videoWidth) return;
    busyRef.current = true;
    try {
      const code = decodeFrame(video);
      if (code) {
        submit(code);
        return;
      }
    } catch (e) {
      /* no code in this frame — keep polling */
    }
    busyRef.current = false;
  }

  function decodeFrame(video) {
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    for (const angle of [0, 90, 180, 270]) {
      const source = rotatedLuminanceSource(canvas, angle);
      try {
        const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(source));
        const result = readerRef.current.decode(bitmap);
        if (result?.getText()) return result.getText();
      } catch (e) {
        /* try the next angle */
      } finally {
        readerRef.current.reset();
      }
    }
    return null;
  }

  function rotatedLuminanceSource(canvas, angle) {
    let src = canvas;
    if (angle !== 0) {
      const rc = rotCanvasRef.current;
      const swap = angle === 90 || angle === 270;
      rc.width = swap ? canvas.height : canvas.width;
      rc.height = swap ? canvas.width : canvas.height;
      const rctx = rc.getContext('2d');
      rctx.save();
      rctx.translate(rc.width / 2, rc.height / 2);
      rctx.rotate((angle * Math.PI) / 180);
      rctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      rctx.restore();
      src = rc;
    }
    const ctx = src.getContext('2d');
    const { data } = ctx.getImageData(0, 0, src.width, src.height);
    const luminances = new Uint8ClampedArray(src.width * src.height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      luminances[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    }
    return new ZXing.RGBLuminanceSource(luminances, src.width, src.height);
  }

  function stopCamera() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    busyRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    readerRef.current = null;
  }

  function handleClose() {
    stopCamera();
    onClose?.();
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    submit(manualValue);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="sm:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
        <h3 className="font-display font-semibold text-ink-950">{title}</h3>
        <p className="text-xs text-slate-500 mb-3">{hint}</p>

        {status === 'scanning' && (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] mb-3">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-[14%] border-2 border-white/85 rounded-2xl pointer-events-none" style={{ boxShadow: '0 0 0 2000px rgba(0,0,0,0.25)' }} />
            <div className="absolute left-0 right-0 bottom-2 text-center text-white text-xs font-semibold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
              Scanning…
            </div>
          </div>
        )}
        {status === 'unsupported' && (
          <div className="p-3.5 rounded-xl bg-slate-50 text-slate-500 text-sm mb-3">{unsupportedMsg}</div>
        )}

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            autoFocus
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="Or type/scan with a hardware scanner…"
            className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
          />
          <button className="bg-ink-950 text-white px-4 rounded-lg">
            <Icon name="check" className="w-4 h-4" />
          </button>
        </form>
        <button onClick={handleClose} className="w-full mt-3.5 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
