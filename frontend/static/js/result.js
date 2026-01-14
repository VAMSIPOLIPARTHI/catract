// frontend/static/js/result.js

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const hashId = window.location.hash ? window.location.hash.substring(1) : null;
    const reportId = params.get("report_id") || hashId;

    const downloadBtn = document.getElementById("downloadReportBtn");
    const analyzeAnotherBtn = document.getElementById("analyzeAnotherBtn");
    const userImageDiv = document.getElementById("userImage");
    const resultsContainer = document.getElementById("resultsContainer");
    const recommendationsDiv = document.getElementById("recommendations");

    /* --------------------------------------------------
       Helpers
    -------------------------------------------------- */

    function normalizeLabel(label) {
        if (!label) return "inconclusive";
        const l = label.toLowerCase();
        if (l === "normal") return "healthy";
        if (l === "cataract") return "cataract";
        return "inconclusive";
    }

    function makeRecommendation(iconName, title, desc) {
        const div = document.createElement("div");
        div.className = "flex items-start gap-3 mb-4";
        div.innerHTML = `
            <span class="material-symbols-outlined text-primary mt-1">${iconName}</span>
            <div>
                <h4 class="font-semibold">${title}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">${desc}</p>
            </div>
        `;
        return div;
    }

    /* --------------------------------------------------
       Buttons
    -------------------------------------------------- */

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

    /* --------------------------------------------------
       Load Report Data
    -------------------------------------------------- */

    function loadFromSession(id) {
        try {
            const raw = sessionStorage.getItem(`report_${id}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn("Session parse failed", e);
            return null;
        }
    }

    if (!reportId) {
        resultsContainer.innerHTML = `
            <div class="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                <h3 class="text-lg font-bold text-red-700 mb-2">Error</h3>
                <p class="text-red-600">Missing report ID.</p>
            </div>
        `;
        return;
    }

    const meta = loadFromSession(reportId);
    const imageDataUrl = meta?.image_dataurl || null;
    const results = meta?.results || [];

    /* --------------------------------------------------
       Show Image
    -------------------------------------------------- */

    if (imageDataUrl && userImageDiv) {
        userImageDiv.style.backgroundImage = `url("${imageDataUrl}")`;
        userImageDiv.style.backgroundSize = "contain";
        userImageDiv.style.backgroundRepeat = "no-repeat";
    } else if (userImageDiv) {
        userImageDiv.innerHTML = `
            <span class="text-xs text-gray-500 flex justify-center items-center h-full">
                No Preview
            </span>
        `;
    }

    /* --------------------------------------------------
       Result Card
    -------------------------------------------------- */

    function createResultCard(result) {
        const label = normalizeLabel(result.label);
        const confidence = result.confidence;

        const isCataract = label === "cataract" && confidence >= 0.85;
        const isHealthy = label === "healthy" && confidence >= 0.85;

        let colorClass = "text-primary-600 dark:text-primary-400";
        let bgClass = "bg-primary-50 dark:bg-primary-900/10";
        let borderClass = "border-primary-100 dark:border-primary-900/20";
        let icon = "help";
        let title = "Inconclusive";
        let desc = "The AI was unsure. Please retake the image in better lighting.";

        if (isCataract) {
            colorClass = "text-red-600 dark:text-red-400";
            bgClass = "bg-red-50 dark:bg-red-900/10";
            borderClass = "border-red-100 dark:border-red-900/20";
            icon = "warning";
            title = "Cataract Detected";
            desc = "AI detected signs consistent with cataracts in this eye.";
        } else if (isHealthy) {
            colorClass = "text-green-600 dark:text-green-400";
            bgClass = "bg-green-50 dark:bg-green-900/10";
            borderClass = "border-green-100 dark:border-green-900/20";
            icon = "check_circle";
            title = "Healthy Eye";
            desc = "No obvious signs of cataract detected.";
        }

        const card = document.createElement("div");
        card.className = `relative overflow-hidden rounded-3xl border ${borderClass} bg-white dark:bg-dark-card shadow-lg`;

        card.innerHTML = `
            <div class="flex flex-col sm:flex-row">
                <div class="w-full sm:w-24 ${bgClass} flex items-center justify-center py-6">
                    <span class="material-symbols-outlined text-4xl ${colorClass}">
                        ${icon}
                    </span>
                </div>

                <div class="p-6 flex-grow">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="text-xs uppercase font-bold ${colorClass}">
                                ${result.side || "Detected Eye"}
                            </span>
                            <h2 class="text-2xl font-bold">${title}</h2>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-black ${colorClass}">
                                ${(confidence * 100).toFixed(1)}%
                            </div>
                            <div class="text-xs uppercase text-gray-500">Confidence</div>
                        </div>
                    </div>
                    <p class="text-gray-600 dark:text-gray-400">${desc}</p>
                </div>
            </div>
        `;
        return card;
    }

    /* --------------------------------------------------
       Render Results
    -------------------------------------------------- */

    resultsContainer.innerHTML = "";
    if (!results.length) {
        resultsContainer.innerHTML = `
            <p class="text-center text-gray-500 italic">
                No results available.
            </p>
        `;
    } else {
        results.forEach(r => {
            resultsContainer.appendChild(createResultCard(r));
        });
    }

    /* --------------------------------------------------
       Recommendations
    -------------------------------------------------- */

    recommendationsDiv.innerHTML = "";

    const hasCataract = results.some(r =>
        normalizeLabel(r.label) === "cataract" && r.confidence >= 0.85
    );

    const allHealthy = results.length > 0 && results.every(r =>
        normalizeLabel(r.label) === "healthy" && r.confidence >= 0.85
    );

    if (hasCataract) {
        recommendationsDiv.appendChild(
            makeRecommendation("health_and_safety", "Consult an Ophthalmologist",
                "One or more eyes showed cataract signs. Seek professional evaluation.")
        );
        recommendationsDiv.appendChild(
            makeRecommendation("medical_information", "Bring This Report",
                "Share this AI report with your doctor.")
        );
    } else if (allHealthy) {
        recommendationsDiv.appendChild(
            makeRecommendation("check_circle", "No Cataract Detected",
                "Your eyes appear healthy. Maintain regular eye checkups.")
        );
        recommendationsDiv.appendChild(
            makeRecommendation("visibility", "Protect Your Vision",
                "Use UV protection and maintain eye health.")
        );
    } else {
        recommendationsDiv.appendChild(
            makeRecommendation("help", "Inconclusive Result",
                "Retake the image in better lighting or consult a professional.")
        );
    }
});
