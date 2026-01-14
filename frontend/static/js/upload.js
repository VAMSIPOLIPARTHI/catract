// frontend/static/js/upload.js
// FINAL MEDICAL-GRADE VERSION
// Camera + File upload ONLY (no medical logic)

// --------------------------------------------------
// ELEMENTS
// --------------------------------------------------
const browseBtn = document.getElementById("browse-file-btn");
const fileInput = document.getElementById("fileInput");
const startCamBtn = document.getElementById("startCam");
const flipCamBtn = document.getElementById("flipCam"); // ✅ NEW
const captureBtn = document.getElementById("captureBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");

const videoEl = document.getElementById("camera");
const filePreviewEl = document.getElementById("file-preview");
const filePlaceholderEl = document.getElementById("file-upload-placeholder");
const capturePreviewEl = document.getElementById("capture-preview");
const cameraPlaceholderEl = document.getElementById("camera-placeholder");

// --------------------------------------------------
// STATE
// --------------------------------------------------
let stream = null;
let facingMode = "environment"; // back camera default (medical)
let lastFile = null;
let lastCaptureBlob = null;
let lastDataUrl = null;

// API_BASE loaded from config.js

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
function setStatus(text, isError = false) {
    if (!statusEl) return;
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

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    videoEl.srcObject = null;
    videoEl.classList.add("hidden");
    cameraPlaceholderEl.classList.remove("hidden");
    startCamBtn.textContent = "Start Camera";
}

// --------------------------------------------------
// FILE UPLOAD
// --------------------------------------------------
browseBtn?.addEventListener("click", () => fileInput.click());

fileInput?.addEventListener("change", async e => {
    stopCamera();
    capturePreviewEl.classList.add("hidden");

    const file = e.target.files?.[0];
    if (!file) {
        analyzeBtn.disabled = true;
        setStatus("No file selected.");
        return;
    }

    lastFile = file;
    lastCaptureBlob = null;

    lastDataUrl = await blobToDataUrl(file);
    filePreviewEl.src = lastDataUrl;
    filePreviewEl.classList.remove("hidden");
    filePlaceholderEl.classList.add("hidden");

    analyzeBtn.disabled = false;
    setStatus("Image selected. Ready to analyze.");
});

// --------------------------------------------------
// CAMERA START / STOP
// --------------------------------------------------
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

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: false
        });

        videoEl.srcObject = stream;
        videoEl.classList.remove("hidden");
        cameraPlaceholderEl.classList.add("hidden");

        startCamBtn.textContent = "Stop Camera";
        analyzeBtn.disabled = false;
        setStatus("Camera started. Use Capture.");
    } catch (err) {
        setStatus("Camera access failed.", true);
        console.error(err);
    }
});

// --------------------------------------------------
// CAMERA FLIP (FRONT ↔ BACK)
// --------------------------------------------------
flipCamBtn?.addEventListener("click", async () => {
    if (!stream) {
        setStatus("Start camera first.", true);
        return;
    }

    facingMode = facingMode === "user" ? "environment" : "user";
    stopCamera();

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: false
        });
        videoEl.srcObject = stream;
        videoEl.classList.remove("hidden");
        cameraPlaceholderEl.classList.add("hidden");

        setStatus(
            facingMode === "environment"
                ? "Rear camera active."
                : "Front camera active."
        );
    } catch (err) {
        setStatus("Camera flip failed.", true);
        console.error(err);
    }
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
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoEl, 0, 0);

    canvas.toBlob(async blob => {
        if (!blob) {
            setStatus("Capture failed.", true);
            return;
        }

        lastCaptureBlob = blob;
        lastFile = null;

        lastDataUrl = await blobToDataUrl(blob);
        capturePreviewEl.src = lastDataUrl;
        capturePreviewEl.classList.remove("hidden");
        videoEl.classList.add("hidden");

        setStatus("Captured image. Uploading...");
        await postBlobAndRedirect(blob);
    }, "image/jpeg", 0.95);
});

// --------------------------------------------------
// ANALYZE BUTTON
// --------------------------------------------------
analyzeBtn?.addEventListener("click", async () => {
    if (lastFile) {
        setStatus("Uploading image...");
        await postFileAndRedirect(lastFile);
    } else if (lastCaptureBlob) {
        setStatus("Uploading capture...");
        await postBlobAndRedirect(lastCaptureBlob);
    } else {
        setStatus("Select file or use camera.", true);
    }
});

// --------------------------------------------------
// POST HELPERS
// --------------------------------------------------
async function postBlobAndRedirect(blob) {
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    await postFileAndRedirect(file);
}

async function postFileAndRedirect(file) {
    analyzeBtn.disabled = true;

    try {
        const fd = new FormData();
        fd.append("image", file);

        const res = await fetch(`${API_BASE}/api/analyze`, {
            method: "POST",
            body: fd
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed");

        sessionStorage.setItem(
            `report_${data.report_id}`,
            JSON.stringify({
                report_id: data.report_id,
                results: data.results,
                image_dataurl: lastDataUrl,
                download_url: data.download_url
            })
        );

        window.location.href =
            `result.html?report_id=${data.report_id}#${data.report_id}`;
    } catch (err) {
        console.error(err);
        setStatus(err.message, true);
        analyzeBtn.disabled = false;
    }
}

// --------------------------------------------------
// INIT
// --------------------------------------------------
(function init() {
    analyzeBtn.disabled = true;
    setStatus("Select an image or start the camera.");
})();
