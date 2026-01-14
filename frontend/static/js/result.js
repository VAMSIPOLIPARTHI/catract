// frontend/static/js/result.js
// FINAL MEDICAL-GRADE VERSION
// Frontend is DISPLAY ONLY – no medical logic, no thresholds

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const hashId = window.location.hash ? window.location.hash.substring(1) : null;
    const reportId = params.get("report_id") || hashId;

    const downloadBtn = document.getElementById("downloadReportBtn");
    const analyzeAnotherBtn = document.getElementById("analyzeAnotherBtn");
    const userImageDiv = document.getElementById("userImage");
    const resultsContainer = document.getElementById("resultsContainer");
    const recommendationsDiv = document.getElementById("recommendations");

    /* ==================================================
       HELPERS
    ================================================== */

    function normalizeLabel(label) {
        if (!label) return "inconclusive";
        return label.toLowerCase();
    }

    function makeRecommendation(icon, title, desc) {
        const div = document.createElement("div");
        div.className = "flex items-start gap-3 mb-4";
        div.innerHTML = `
            <span class="material-symbols-outlined text-primary mt-1">${icon}</span>
            <div>
                <h4 class="font-semibold">${title}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">${desc}</p>
            </div>
        `;
        return div;
    }

    /* ==================================================
       BUTTON ACTIONS
    ================================================== */

    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            if (!reportId) {
                alert("No report ID available.");
                return;
            }
            window.location.href = `${API_BASE}/report/${encodeURIComponent(reportId)}`;
        });
    }

    if (analyzeAnotherBtn) {
        analyzeAnotherBtn.addEventListener("click", () => {
            window.location.href = "upload.html";
        });
    }

    /* ==================================================
       LOAD REPORT DATA
    ================================================== */

    function loadFromSession(id) {
        try {
            const raw = sessionStorage.getItem(`report_${id}`);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    if (!reportId) {
        resultsContainer.innerHTML = `
            <div class="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                <h3 class="text-lg font-bold text-red-700">Error</h3>
                <p class="text-red-600">Missing report ID.</p>
            </div>
        `;
        return;
    }

    const meta = loadFromSession(reportId);
    const imageDataUrl = meta?.image_dataurl || null;
    const results = meta?.results || [];

    /* ==================================================
       DISPLAY INPUT IMAGE
    ================================================== */

    if (imageDataUrl && userImageDiv) {
        userImageDiv.style.backgroundImage = `url("${imageDataUrl}")`;
        userImageDiv.style.backgroundSize = "contain";
        userImageDiv.style.backgroundRepeat = "no-repeat";
        userImageDiv.style.backgroundPosition = "center";
    } else if (userImageDiv) {
        userImageDiv.innerHTML = `
            <span class="text-xs text-gray-500 flex justify-center items-center h-full">
                No Preview Available
            </span>
        `;
    }

    /* ==================================================
       RESULT CARD (DISPLAY ONLY)
    ================================================== */

    function createResultCard(result) {
        const label = normalizeLabel(result.label);

        let icon = "help";
        let title = "Inconclusive";
        let desc = "The AI could not make a confident medical decision.";
        let color = "text-gray-600";
        let bg = "bg-gray-50";
        let border = "border-gray-200";

        if (label === "cataract") {
            icon = "warning";
            title = "Cataract Detected";
            desc = "Signs consistent with cataract were detected in this eye.";
            color = "text-red-600";
            bg = "bg-red-50";
            border = "border-red-200";
        } else if (label === "healthy") {
            icon = "check_circle";
            title = "Healthy Eye";
            desc = "No signs of cataract were detected.";
            color = "text-green-600";
            bg = "bg-green-50";
            border = "border-green-200";
        }

        const card = document.createElement("div");
        card.className = `relative overflow-hidden rounded-3xl border ${border} bg-white shadow-lg`;

        card.innerHTML = `
            <div class="flex flex-col sm:flex-row">
                <div class="w-full sm:w-24 ${bg} flex items-center justify-center py-6">
                    <span class="material-symbols-outlined text-4xl ${color}">
                        ${icon}
                    </span>
                </div>

                <div class="p-6 flex-grow">
                    <span class="text-xs uppercase font-bold ${color}">
                        ${result.side || "Detected Eye"}
                    </span>

                    <h2 class="text-2xl font-bold">${title}</h2>

                    <p class="text-gray-600 dark:text-gray-400">
                        ${desc}
                    </p>

                    <p class="text-sm text-gray-400 mt-2">
                        Model confidence: ${(result.confidence * 100).toFixed(1)}%
                    </p>
                </div>
            </div>
        `;
        return card;
    }

    /* ==================================================
       RENDER RESULTS
    ================================================== */

    resultsContainer.innerHTML = "";

    if (!results.length) {
        resultsContainer.innerHTML = `
            <p class="text-center text-gray-500 italic">
                No analysis results available.
            </p>
        `;
    } else {
        results.forEach(r => {
            resultsContainer.appendChild(createResultCard(r));
        });
    }

    /* ==================================================
       MEDICAL RECOMMENDATIONS (LABEL-BASED ONLY)
    ================================================== */

    recommendationsDiv.innerHTML = "";

    const hasCataract = results.some(r => normalizeLabel(r.label) === "cataract");
    const allHealthy =
        results.length > 0 &&
        results.every(r => normalizeLabel(r.label) === "healthy");

    if (hasCataract) {
        recommendationsDiv.appendChild(
            makeRecommendation(
                "health_and_safety",
                "Consult an Ophthalmologist",
                "One or more eyes show cataract signs. Professional ophthalmic evaluation is recommended."
            )
        );
        recommendationsDiv.appendChild(
            makeRecommendation(
                "medical_information",
                "Bring This Report",
                "Share this AI screening report with your eye care professional."
            )
        );
    } else if (allHealthy) {
        recommendationsDiv.appendChild(
            makeRecommendation(
                "check_circle",
                "No Cataract Detected",
                "Eyes appear healthy. Continue routine eye examinations."
            )
        );
        recommendationsDiv.appendChild(
            makeRecommendation(
                "visibility",
                "Maintain Eye Health",
                "Protect eyes from UV exposure and maintain a healthy lifestyle."
            )
        );
    } else {
        recommendationsDiv.appendChild(
            makeRecommendation(
                "help",
                "Inconclusive Result",
                "Retake the image with better lighting or consult an eye care professional."
            )
        );
    }
});
