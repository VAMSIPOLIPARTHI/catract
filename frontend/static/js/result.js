/**
 * frontend/static/js/result.js
 * FINAL PRODUCTION VERSION - Fixed Visibility & Adaptive Contrast (Toggle Removed)
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. DATA INITIALIZATION ---
    const params = new URLSearchParams(window.location.search);
    const hashId = window.location.hash ? window.location.hash.substring(1) : null;
    const reportId = params.get("report_id") || hashId;

    const downloadBtn = document.getElementById("downloadReportBtn");
    const analyzeAnotherBtn = document.getElementById("analyzeAnotherBtn");
    const userImageDiv = document.getElementById("userImage");
    const resultsContainer = document.getElementById("resultsContainer");
    const recommendationsDiv = document.getElementById("recommendations");
    const reportIdDisplay = document.getElementById("reportIdDisplay");
    const reportDate = document.getElementById("reportDate");

    if (reportDate) reportDate.textContent = new Date().toLocaleDateString();

    /* ==================================================
       HELPERS
    ================================================== */

    function normalizeLabel(label) {
        if (!label) return "inconclusive";
        return label.toLowerCase().trim();
    }

    function makeRecommendation(icon, title, desc, isWarning = false) {
        const div = document.createElement("div");
        const iconColor = isWarning ? "text-orange-500" : "text-primary-500";
        const bgColor = isWarning 
            ? "bg-orange-50/50 dark:bg-orange-900/10" 
            : "bg-white dark:bg-slate-800/50";
        
        div.className = `flex items-start gap-3 mb-4 p-4 rounded-xl ${bgColor} border border-gray-100 dark:border-slate-700 shadow-sm transition-all`;
        div.innerHTML = `
            <span class="material-symbols-outlined ${iconColor} mt-1">${icon}</span>
            <div>
                <h4 class="font-semibold text-gray-900 dark:text-white">${title}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">${desc}</p>
            </div>
        `;
        return div;
    }

    /* ==================================================
       RENDER RESULT CARD (ADAPTIVE)
    ================================================== */

    function createResultCard(result) {
        const label = normalizeLabel(result.label);
        
        let icon = "help", title = "Inconclusive", color = "text-gray-600 dark:text-gray-400";
        let bg = "bg-gray-50 dark:bg-slate-800", border = "border-gray-200 dark:border-slate-700";
        let desc = "The AI could not make a confident decision.";

        if (label === "cataract") {
            icon = "warning"; title = "Cataract Detected"; 
            color = "text-red-600 dark:text-red-400"; 
            bg = "bg-red-50 dark:bg-red-900/20"; 
            border = "border-red-200 dark:border-red-900/30";
            desc = "Signs consistent with cataract were detected in this eye.";
        } else if (label === "normal" || label === "healthy") {
            icon = "check_circle"; title = "Healthy Eye"; 
            color = "text-green-600 dark:text-green-400"; 
            bg = "bg-green-50 dark:bg-green-900/20"; 
            border = "border-green-200 dark:border-green-900/30";
            desc = "No signs of cataract were detected.";
        }

        const card = document.createElement("div");
        card.className = `relative overflow-hidden rounded-3xl border ${border} bg-white dark:bg-slate-900 shadow-lg mb-6 transition-all hover:shadow-xl`;

        const warningHtml = result.warning 
            ? `<div class="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl flex items-center gap-2">
                 <span class="material-symbols-outlined text-orange-500 text-sm">info</span>
                 <p class="text-xs text-orange-700 dark:text-orange-300 font-medium">Quality Note: ${result.warning}</p>
               </div>` 
            : "";

        card.innerHTML = `
            <div class="flex flex-col sm:flex-row">
                <div class="w-full sm:w-28 ${bg} flex items-center justify-center py-8">
                    <span class="material-symbols-outlined text-5xl ${color}">${icon}</span>
                </div>
                <div class="p-6 flex-grow">
                    <span class="text-xs uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">${result.side || "Eye"}</span>
                    <h2 class="text-2xl font-bold mt-1 text-gray-900 dark:text-white">${title}</h2>
                    <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">${desc}</p>
                    <div class="flex items-center gap-4 mt-4">
                         <p class="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">AI Certainty: ${(result.confidence * 100).toFixed(1)}%</p>
                    </div>
                    ${warningHtml}
                </div>
            </div>
        `;
        return card;
    }

    /* ==================================================
       LOAD REPORT DATA
    ================================================= */

    function loadFromSession(id) {
        try {
            const raw = sessionStorage.getItem(`report_${id}`);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    if (!reportId) {
        resultsContainer.innerHTML = `
            <div class="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                <h3 class="text-lg font-bold text-red-700 dark:text-red-400">Analysis Not Found</h3>
                <p class="text-red-600 dark:text-red-500">Please try uploading your image again.</p>
            </div>
        `;
        return;
    }

    const meta = loadFromSession(reportId);
    if (reportIdDisplay) reportIdDisplay.textContent = reportId.substring(0, 8);

    if (meta?.image_dataurl && userImageDiv) {
        userImageDiv.style.backgroundImage = `url("${meta.image_dataurl}")`;
        userImageDiv.style.backgroundSize = "contain";
        userImageDiv.style.backgroundRepeat = "no-repeat";
        userImageDiv.style.backgroundPosition = "center";
    }

    resultsContainer.innerHTML = "";
    recommendationsDiv.innerHTML = "";

    if (meta?.error) {
        resultsContainer.innerHTML = `
            <div class="text-center p-10 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-200 dark:border-orange-900/30">
                <span class="material-symbols-outlined text-6xl text-orange-400 mb-4">face_off</span>
                <h3 class="text-xl font-bold text-orange-800 dark:text-orange-300">No Eyes Detected</h3>
                <p class="text-orange-700 dark:text-orange-400 mt-2 text-sm">${meta.error}</p>
            </div>`;
        recommendationsDiv.appendChild(makeRecommendation("photo_camera", "Improve Lighting", "Ensure the face is brightly lit without reflections.", true));
    } else if (meta?.results && meta.results.length > 0) {
        meta.results.forEach(r => resultsContainer.appendChild(createResultCard(r)));

        const hasCataract = meta.results.some(r => normalizeLabel(r.label) === "cataract");
        const hasWarning = meta.results.some(r => r.warning);

        if (hasCataract) {
            recommendationsDiv.appendChild(makeRecommendation("health_and_safety", "Seek Professional Advice", "Signs of cataract detected. Schedule a professional ophthalmic exam."));
        } else {
            recommendationsDiv.appendChild(makeRecommendation("verified", "Routine Eye Care", "No cataract signs detected. Maintain annual preventive checkups."));
        }

        if (hasWarning) {
            recommendationsDiv.appendChild(makeRecommendation("refresh", "Quality Notice", "Environmental factors impacted AI certainty. Retaking without flash may improve results.", true));
        }
    } else {
        resultsContainer.innerHTML = `<p class="text-center text-gray-500 italic p-10">No results found for this session.</p>`;
    }

    // --- BUTTON ACTIONS ---
    if (downloadBtn) {
        downloadBtn.onclick = () => window.location.href = `${API_BASE}/report/${encodeURIComponent(reportId)}`;
    }
    if (analyzeAnotherBtn) {
        analyzeAnotherBtn.onclick = () => window.location.href = "upload.html";
    }
});
