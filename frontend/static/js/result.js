// frontend/static/js/result.js
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    // Fallback: Check hash if query param is lost (common with npx serve redirects)
    const hashId = window.location.hash ? window.location.hash.substring(1) : null;
    const reportId = params.get("report_id") || hashId;
    const downloadBtn = document.getElementById("downloadReportBtn");
    const analyzeAnotherBtn = document.getElementById("analyzeAnotherBtn");
    const userImageDiv = document.getElementById("userImage");
    const resultsContainer = document.getElementById("resultsContainer");
    const recommendationsDiv = document.getElementById("recommendations");

    // 1. Wire up buttons IMMEDIATELY so user is not stuck if error occurs
    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            if (reportId) {
                // API_BASE is defined in static/js/config.js
                window.location.href = `${API_BASE}/report/${encodeURIComponent(reportId)}`;
            } else {
                alert("No report ID available to download.");
            }
        });
    }

    if (analyzeAnotherBtn) {
        analyzeAnotherBtn.addEventListener("click", () => window.location.href = "upload.html");
    }

    // 2. Check for Report ID
    if (!reportId) {
        console.error("Missing report_id in URL:", window.location.href);
        resultsContainer.innerHTML = `
        <div class="text-center p-6 bg-red-50 rounded-xl border border-red-200">
            <h3 class="text-lg font-bold text-red-700 mb-2">Error: No Report Found</h3>
            <p class="text-red-600 mb-4">The report ID is missing from the URL.</p>
            <p class="text-xs text-gray-500 font-mono bg-white p-2 rounded mb-4 break-all">${window.location.href}</p>
            <button onclick="window.location.href='upload.html'" class="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Try Again</button>
        </div>
    `;
        return;
    }

    // Helper to build recommendation item
    function makeRecommendation(iconName, title, desc) {
        const li = document.createElement("div");
        li.className = "flex items-start gap-3 mb-4";
        li.innerHTML = `
      <span class="material-symbols-outlined text-primary mt-1">${iconName}</span>
      <div>
        <h4 class="font-semibold">${title}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">${desc}</p>
      </div>
    `;
        return li;
    }

    // Generate Recommendation List based on findings
    function getTotalRecommendations(results) {
        const recs = [];

        // Check if any eye has cataract
        const hasCataract = results.some(r => r.label === "cataract" && r.confidence > 0.65);
        const allHealthy = results.every(r => r.label === "healthy" && r.confidence > 0.6);

        if (hasCataract) {
            recs.push(makeRecommendation("health_and_safety", "Consult an Ophthalmologist — Urgent", "One or more eyes showed signs of cataract. Schedule a comprehensive eye exam."));
            recs.push(makeRecommendation("medical_information", "Bring This Report", "Show these results to your doctor to help them locate the issue."));
            recs.push(makeRecommendation("monitor_heart", "Prepare for Treatment Options", "Cataract surgery is a common and safe procedure if recommended."));
        } else if (allHealthy) {
            recs.push(makeRecommendation("check_circle", "No Cataract Detected", "Both eyes appear healthy. Maintain regular eye care habits."));
            recs.push(makeRecommendation("visibility", "Protect Your Vision", "Wear UV-protective sunglasses and maintain a healthy diet."));
        } else {
            // Inconclusive or mixed low confidence
            recs.push(makeRecommendation("help", "Inconclusive Result", "The AI was unsure. Please retake the image in better lighting or consult a professional."));
            recs.push(makeRecommendation("camera_alt", "Retake with Better Lighting", "Make sure the photo is sharp, well-lit, and glare-free."));
        }
        return recs;
    }

    function createResultCard(result) {
        const isCataract = result.label === "cataract";
        const isHealthy = result.label === "healthy";

        let colorClass = "text-primary-600 dark:text-primary-400";
        let bgClass = "bg-primary-50 dark:bg-primary-900/10";
        let borderClass = "border-primary-100 dark:border-primary-900/20";
        let icon = "help";
        let title = "Inconclusive";
        let desc = "Confidence is low. Please verify.";

        if (isCataract) {
            colorClass = "text-red-600 dark:text-red-400";
            bgClass = "bg-red-50 dark:bg-red-900/10";
            borderClass = "border-red-100 dark:border-red-900/20";
            icon = "warning";
            title = "Cataract Detected";
            desc = "AI has detected signs consistent with cataracts in this eye.";
        } else if (isHealthy) {
            colorClass = "text-green-600 dark:text-green-400";
            bgClass = "bg-green-50 dark:bg-green-900/10";
            borderClass = "border-green-100 dark:border-green-900/20";
            icon = "check_circle";
            title = "Healthy Eye";
            desc = "No obvious signs of cataract detected.";
        }

        const card = document.createElement("div");
        card.className = `relative overflow-hidden rounded-3xl border ${borderClass} bg-white dark:bg-dark-card shadow-lg transition-all hover:shadow-xl`;

        card.innerHTML = `
            <div class="flex flex-col sm:flex-row">
                <!-- Status Strip -->
                <div class="w-full sm:w-24 ${bgClass} flex items-center justify-center py-6 sm:py-0">
                    <span class="material-symbols-outlined text-4xl ${colorClass}">${icon}</span>
                </div>
                
                <div class="p-6 md:p-8 flex-grow">
                    <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                            <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${bgClass} ${colorClass} opacity-80">
                                ${result.side || "Detected Eye"}
                            </span>
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">${title}</h2>
                        </div>
                        
                        <div class="text-right">
                             <div class="text-3xl font-black ${colorClass}">
                                ${(result.confidence * 100).toFixed(1)}%
                             </div>
                             <div class="text-xs text-gray-500 uppercase font-bold">Confidence</div>
                        </div>
                    </div>
                    
                    <p class="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                        ${desc}
                    </p>
                </div>
            </div>
        `;
        return card;
    }

    function loadFromSession(reportId) {
        try {
            const raw = sessionStorage.getItem(`report_${reportId}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn("Failed to parse metadata", e);
            return null;
        }
    }

    const meta = loadFromSession(reportId);
    const imageDataUrl = meta && meta.image_dataurl ? meta.image_dataurl : null;
    const results = meta && meta.results ? meta.results : [];

    // Show user image
    if (imageDataUrl && userImageDiv) {
        userImageDiv.style.backgroundImage = `url("${imageDataUrl}")`;
        userImageDiv.style.backgroundSize = "contain";
        userImageDiv.style.backgroundRepeat = "no-repeat";
    } else {
        userImageDiv.style.backgroundImage = `none`;
        // Fallback text if no image
        userImageDiv.innerHTML = '<span class="text-xs text-gray-500 flex justify-center items-center h-full">No Preview</span>';
    }

    // Populate Results
    resultsContainer.innerHTML = "";
    if (!results || results.length === 0) {
        // Logic for when no explicit results are found (error or fallback mismatch)
        resultsContainer.innerHTML = "<p class='text-center text-gray-500 italic'>No detailed results available. An error might have occurred during analysis.</p>";
    } else {
        results.forEach(r => {
            resultsContainer.appendChild(createResultCard(r));
        });
    }

    // Populate Recommendations
    recommendationsDiv.innerHTML = "";
    const recNodes = getTotalRecommendations(results);
    recNodes.forEach(n => recommendationsDiv.appendChild(n));
});