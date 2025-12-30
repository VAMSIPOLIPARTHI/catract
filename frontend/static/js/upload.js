
// frontend/static/js/upload.js - Final Corrected Version

// Elements (IDs match your upload.html)
const browseBtn = document.getElementById("browse-file-btn");
const fileInput = document.getElementById("fileInput");
const startCamBtn = document.getElementById("startCam");
const captureBtn = document.getElementById("captureBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const videoEl = document.getElementById("camera");

// Preview elements
const filePreviewEl = document.getElementById("file-preview");
const filePlaceholderEl = document.getElementById("file-upload-placeholder");
const capturePreviewEl = document.getElementById("capture-preview");
const cameraPlaceholderEl = document.getElementById("camera-placeholder");


let stream = null;
let lastFile = null;        // File selected by user
let lastCaptureBlob = null; // latest camera capture blob
let lastDataUrl = null;     // Latest DataURL for preview/sessionStorage

// Backend base URL (adjust if backend runs elsewhere)
// Backend base URL is now loaded from static/js/config.js
// const API_BASE = "http://localhost:5000"; 


// helper: show status
function setStatus(text, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.style.color = isError ? "#b91c1c" : "";
}

// helper: Convert File/Blob to Base64 DataURL (for preview and sessionStorage)
function blobToDataUrl(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

// -------------------------------------------------------------------
// 1. BROWSE FILE HANDLER
// -------------------------------------------------------------------
if (browseBtn && fileInput) {
    browseBtn.addEventListener("click", () => fileInput.click());
}

if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
        const f = e.target.files && e.target.files[0];

        // Clear camera state
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; videoEl.srcObject = null; startCamBtn.textContent = "Start Camera"; }
        capturePreviewEl.classList.add("hidden");

        if (!f) {
            lastFile = null;
            lastDataUrl = null;
            analyzeBtn.disabled = true;
            filePreviewEl.classList.add("hidden");
            filePlaceholderEl.classList.remove("hidden");
            setStatus("No file selected.");
            return;
        }

        // Convert and show preview
        lastDataUrl = await blobToDataUrl(f);
        filePreviewEl.src = lastDataUrl;
        filePreviewEl.classList.remove("hidden");
        filePlaceholderEl.classList.add("hidden");

        lastFile = f;
        lastCaptureBlob = null;
        analyzeBtn.disabled = false;
        setStatus(`Selected file: ${f.name}. Ready to analyze.`);
    });
}

// -------------------------------------------------------------------
// 2. CAMERA HANDLER
// -------------------------------------------------------------------
if (startCamBtn) {
    startCamBtn.addEventListener("click", async () => {
        if (stream) {
            // stop
            stream.getTracks().forEach(t => t.stop());
            stream = null;
            videoEl.srcObject = null;
            startCamBtn.textContent = "Start Camera";
            analyzeBtn.disabled = true;
            setStatus("Camera stopped.");
            videoEl.classList.add("hidden");
            cameraPlaceholderEl.classList.remove("hidden");
            return;
        }

        // Clear file preview state
        lastFile = null;
        filePreviewEl.classList.add("hidden");
        filePlaceholderEl.classList.remove("hidden");

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
            videoEl.srcObject = stream;
            startCamBtn.textContent = "Stop Camera";
            analyzeBtn.disabled = false; // allow analyze (if you want manual analyze)
            videoEl.classList.remove("hidden");
            cameraPlaceholderEl.classList.add("hidden");
            capturePreviewEl.classList.add("hidden");
            setStatus("Camera started. Use Capture to analyze or click Analyze to send current frame.");
        } catch (err) {
            console.error(err);
            setStatus("Could not access camera: " + (err.message || err), true);
        }
    });
}

// -------------------------------------------------------------------
// 3. CAPTURE & ANALYZE HANDLER
// -------------------------------------------------------------------
if (captureBtn) {
    captureBtn.addEventListener("click", async () => {
        if (!stream) {
            setStatus("Start camera first.", true);
            return;
        }
        // draw current frame to canvas
        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth || 1280;
        canvas.height = videoEl.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        // convert to blob and post
        canvas.toBlob(async (blob) => {
            if (!blob) {
                setStatus("Capture failed.", true);
                return;
            }
            lastCaptureBlob = blob;
            lastFile = null;

            // Convert and show preview
            const dataUrl = await blobToDataUrl(blob);
            lastDataUrl = dataUrl;
            capturePreviewEl.src = dataUrl;
            capturePreviewEl.classList.remove("hidden");
            videoEl.classList.add("hidden");

            setStatus("Captured image — uploading...");
            await postBlobAndRedirect(blob);
        }, "image/jpeg", 0.95);
    });
}

// -------------------------------------------------------------------
// 4. ANALYZE BUTTON HANDLER
// -------------------------------------------------------------------
if (analyzeBtn) {
    analyzeBtn.addEventListener("click", async () => {
        // Priority: selected file -> last camera capture -> capture current frame
        if (lastFile) {
            setStatus("Uploading selected file...");
            await postFileAndRedirect(lastFile);
        } else if (lastCaptureBlob) {
            setStatus("Uploading captured image...");
            await postBlobAndRedirect(lastCaptureBlob);
        } else if (stream) {
            setStatus("Capturing current frame...");
            // capture a frame to send
            const canvas = document.createElement("canvas");
            canvas.width = videoEl.videoWidth || 1280;
            canvas.height = videoEl.videoHeight || 720;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(async (blob) => {
                if (!blob) { setStatus("Capture failed.", true); return; }

                // Convert and show preview 
                const dataUrl = await blobToDataUrl(blob);
                lastDataUrl = dataUrl;
                capturePreviewEl.src = dataUrl;
                capturePreviewEl.classList.remove("hidden");
                videoEl.classList.add("hidden");

                setStatus("Uploading captured image...");
                await postBlobAndRedirect(blob);
            }, "image/jpeg", 0.95);
        } else {
            setStatus("Please select a file or start the camera first.", true);
        }
    });
}

// -------------------------------------------------------------------
// 5. POST HELPERS AND REDIRECTION LOGIC
// -------------------------------------------------------------------
async function postFileAndRedirect(file) {
    // Ensure we have the DataURL before posting the file, for sessionStorage
    let dataUrlToSave = lastDataUrl;
    if (!dataUrlToSave && file) {
        dataUrlToSave = await blobToDataUrl(file);
    }

    analyzeBtn.disabled = true; // Disable while processing
    try {
        const fd = new FormData();
        fd.append("image", file);

        // Request uses FormData (file)
        const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: fd });
        const data = await res.json();

        if (!res.ok) {
            console.error("Analyze error:", data);
            setStatus("Analysis failed: " + (data.error || res.statusText), true);
            return;
        }

        handleAnalyzeResponse(data, dataUrlToSave);
    } catch (err) {
        console.error(err);
        setStatus("Network error: " + err.message, true);
    } finally {
        // Re-enable the button if redirection did not occur due to an error
        analyzeBtn.disabled = false;
    }
}

async function postBlobAndRedirect(blob) {
    // lastDataUrl should have been set in the caller (Capture/Analyze Button)
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    await postFileAndRedirect(file);
}

function handleAnalyzeResponse(data, imageDataUrl) {
    if (!data || !data.report_id) {
        setStatus("Invalid response from server: Missing report ID.", true);
        return;
    }

    // Save metadata to sessionStorage for the result page to read
    try {
        const meta = {
            report_id: data.report_id,
            results: data.results || [], // Store the list of per-eye results
            download_url: data.download_url || `${API_BASE}/report/${data.report_id}`,
            image_dataurl: imageDataUrl // The DataURL saved here ensures preview on result.html
        };
        sessionStorage.setItem(`report_${data.report_id}`, JSON.stringify(meta));
    } catch (e) {
        console.warn("Could not save metadata to sessionStorage:", e);
        setStatus("Warning: Could not save preview data.", true);
    }

    // Redirect to result page
    // We add report_id to BOTH query and hash to survive 'clean url' redirects (e.g. npx serve)
    const resultUrl = `result.html?report_id=${encodeURIComponent(data.report_id)}#${encodeURIComponent(data.report_id)}`;
    console.log("Redirecting to:", resultUrl);
    window.location.assign(resultUrl);
}

// On page load: ensure analyze button disabled by default until file or camera started
(function init() {
    if (analyzeBtn) analyzeBtn.disabled = true;
    setStatus("Select an image or start the camera.");
})();
