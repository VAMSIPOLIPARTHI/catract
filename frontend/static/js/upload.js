// frontend/static/js/upload.js
// FINAL MEDICAL-GRADE VERSION
// Supports FRONT + BACK camera safely (Android & iOS)

const browseBtn = document.getElementById("browse-file-btn");
const fileInput = document.getElementById("fileInput");
const startCamBtn = document.getElementById("startCam");
const flipCamBtn = document.getElementById("flipCam"); // ✅ ADD THIS BUTTON IN HTML
const captureBtn = document.getElementById("captureBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const videoEl = document.getElementById("camera");

// Preview elements
const filePreviewEl = document.getElementById("file-preview");
const filePlaceholderEl = document.getElementById("file-upload-placeholder");
const capturePreviewEl = document.getElementById("capture-preview");
const cameraPlaceholderEl = document.getElementById("camera-placeholder");

// Camera state
let stream = null;
let facingMode = "environment"; // 🔴 default = BACK camera (medical recommended)

let lastFile = null;
let lastCaptureBlob = null;
let lastDataUrl = null;

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function setStatus(text, isError = false) {
    statusEl.textContent = text || "";
    statusEl.style.color = isError ? "#b91c1c" : "";
}

function blobToDataUrl(blob) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

// --------------------------------------------------
// CAMERA CORE (SAFE START)
// --------------------------------------------------
async function startCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }

    try {
        // Try exact mode first (best)
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: facingMode } },
            audio: false
        });
    } catch {
        // Fallback (iOS Safari)
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: false
        });
    }

    videoEl.srcObject = stream;
    videoEl.classList.remove("hidden");
    cameraPlaceholderEl.classList.add("hidden");
    capturePreviewEl.classList.add("hidden");

    analyzeBtn.disabled = false;
    startCamBtn.textContent = "Stop Camera";

    setStatus(
        facingMode === "environment"
            ? "Rear camera active (recommended)."
            : "Front camera active."
    );
}

// --------------------------------------------------
// FILE UPLOAD
// --------------------------------------------------
browseBtn?.addEventListener("click", () => fileInput.click());

fileInput?.addEventListener("change", async e => {
    const f = e.target.files?.[0];

    stopCamera();

    if (!f) {
        analyzeBtn.disabled = true;
        return;
    }

    lastFile = f;
    lastCaptureBlob = null;

    lastDataUrl = await blobToDataUrl(f);
    filePreviewEl.src = lastDataUrl;
    filePreviewEl.classList.remove("hidden");
    filePlaceholderEl.classList.add("hidden");

    analyzeBtn.disabled = false;
    setStatus(`Selected file: ${f.name}`);
});

// --------------------------------------------------
// START / STOP CAMERA
// --------------------------------------------------
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
        videoEl.srcObject = null;
    }

    videoEl.classList.add("hidden");
    cameraPlaceholderEl.classList.remove("hidden");
    startCamBtn.textContent = "Start Camera";
}

startCamBtn?.addEventListener("click", async () => {
    if (stream) {
        stopCamera();
        analyzeBtn.disabled = true;
        setStatus("Camera stopped.");
        return;
    }

    lastFile = null;
    filePreviewEl.classList.add("hidden");
    filePlaceholderEl.classList.remove("hidden");

    await startCamera();
});

// --------------------------------------------------
// FLIP CAMERA (FRONT ↔ BACK)
// --------------------------------------------------
flipCamBtn?.addEventListener("click", async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("Camera not supported.", true);
        return;
    }

    facingMode = facingMode === "environment" ? "user" : "environment";
    await startCamera();
});

// --------------------------------------------------
// CAPTURE IMAGE
// --------------------------------------------------
captureBtn?.addEventListener("click", async () => {
    if (!stream) {
        setStatus("Start camera first.", true);
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth || 1280;
    canvas.height = videoEl.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async blob => {
        lastCaptureBlob = blob;
        lastFile = null;

        lastDataUrl = await blobToDataUrl(blob);
        capturePreviewEl.src = lastDataUrl;
        capturePreviewEl.classList.remove("hidden");
        videoEl.classList.add("hidden");

        setStatus("Captured image — uploading...");
        await postBlobAndRedirect(blob);
    }, "image/jpeg", 0.95);
});

// --------------------------------------------------
// ANALYZE
// --------------------------------------------------
analyzeBtn?.addEventListener("click", async () => {
    if (lastFile) {
        await postFileAndRedirect(lastFile);
    } else if (lastCaptureBlob) {
        await postBlobAndRedirect(lastCaptureBlob);
    } else if (stream) {
        captureBtn.click();
    } else {
        setStatus("Select a file or start camera.", true);
    }
});

// --------------------------------------------------
// BACKEND COMMUNICATION
// --------------------------------------------------
async function postFileAndRedirect(file) {
    analyzeBtn.disabled = true;

    const fd = new FormData();
    fd.append("image", file);

    const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: fd
    });

    const data = await res.json();
    if (!res.ok) {
        setStatus(data.error || "Analysis failed", true);
        analyzeBtn.disabled = false;
        return;
    }

    sessionStorage.setItem(
        `report_${data.report_id}`,
        JSON.stringify({
            report_id: data.report_id,
            results: data.results,
            image_dataurl: lastDataUrl,
            download_url: data.download_url
        })
    );

    window.location.href = `result.html?report_id=${data.report_id}#${data.report_id}`;
}

async function postBlobAndRedirect(blob) {
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    await postFileAndRedirect(file);
}

// --------------------------------------------------
// INIT
// --------------------------------------------------
(function init() {
    analyzeBtn.disabled = true;
    setStatus("Select an image or start the camera.");
})();
