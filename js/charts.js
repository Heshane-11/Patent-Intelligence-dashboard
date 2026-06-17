/**
 * charts.js
 * ChartManager manages Chart.js instances, configuration, updates,
 * and handles light/dark mode styling for all dashboard views.
 * Refactored to include McKinsey Quadrant Bubble plot & Comparison charts.
 */

const ChartManager = (() => {
  // Store chart instances
  const charts = {};

  // Theme colors
  const lightColors = {
    text: "#475569",
    grid: "#f1f5f9",
    primary: "#2563eb",
    success: "#0d9488",
    warning: "#ea580c",
    danger: "#e11d48",
    info: "#0284c7",
    palette: [
      "#2563eb", "#0d9488", "#ea580c", "#8b5cf6", "#ec4899",
      "#0284c7", "#f59e0b", "#10b981", "#6366f1", "#a855f7"
    ]
  };

  const darkColors = {
    text: "#94a3b8",
    grid: "#1e293b",
    primary: "#3b82f6",
    success: "#14b8a6",
    warning: "#f97316",
    danger: "#f43f5e",
    info: "#38bdf8",
    palette: [
      "#3b82f6", "#14b8a6", "#f97316", "#a78bfa", "#f472b6",
      "#38bdf8", "#fbbf24", "#34d399", "#818cf8", "#c084fc"
    ]
  };

  function getThemeColors() {
    const isDark = document.body.classList.contains("dark-mode");
    return isDark ? darkColors : lightColors;
  }

  /**
   * Helper: Get base options for clean professional charts
   */
  function getBaseOptions(titleText, colors, customOptions = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: colors.text,
            font: { family: "Plus Jakarta Sans", size: 11, weight: 500 },
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true
          }
        },
        title: {
          display: false
        },
        tooltip: {
          backgroundColor: document.body.classList.contains("dark-mode") ? "#0f172a" : "#ffffff",
          titleColor: document.body.classList.contains("dark-mode") ? "#f1f5f9" : "#0f172a",
          bodyColor: document.body.classList.contains("dark-mode") ? "#94a3b8" : "#475569",
          borderColor: colors.grid,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: { family: "Plus Jakarta Sans", weight: 700 },
          bodyFont: { family: "Plus Jakarta Sans" }
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid, drawBorder: false },
          ticks: { color: colors.text, font: { family: "Plus Jakarta Sans", size: 10 } }
        },
        y: {
          grid: { color: colors.grid, drawBorder: false },
          ticks: { color: colors.text, font: { family: "Plus Jakarta Sans", size: 10 } }
        }
      },
      ...customOptions
    };
  }

  /**
   * Initialize or update a specific chart
   */
  function updateChart(chartId, type, data, options) {
    if (charts[chartId]) {
      charts[chartId].data = data;
      charts[chartId].options = options;
      charts[chartId].update("none");
    } else {
      const ctx = document.getElementById(chartId);
      if (!ctx) return;
      
      charts[chartId] = new Chart(ctx, {
        type,
        data,
        options
      });
    }
  }

  /**
   * Executive Overview - Line: Filing Trends
   */
  function renderFilingTrends(data, chartId = "execFilingTrends") {
    const colors = getThemeColors();
    const years = Array.from({length: 11}, (_, i) => 2015 + i);
    const yearlyCounts = {};
    years.forEach(y => { yearlyCounts[y] = 0; });
    data.forEach(p => {
      if (yearlyCounts[p.filing_year] !== undefined) {
        yearlyCounts[p.filing_year]++;
      }
    });

    const chartData = {
      labels: years.map(String),
      datasets: [{
        label: "Patent Filings",
        data: years.map(y => yearlyCounts[y]),
        borderColor: colors.primary,
        backgroundColor: colors.primary + "1A",
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: colors.primary,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };

    const options = getBaseOptions("Patent Filings by Year", colors);
    updateChart(chartId, "line", chartData, options);
  }

  /**
   * Executive Overview - Bar: Country-wise distribution
   */
  function renderCountryDistribution(data, chartId = "execCountryDist") {
    const colors = getThemeColors();
    const countryCounts = {};
    data.forEach(p => {
      countryCounts[p.country] = (countryCounts[p.country] || 0) + 1;
    });

    const sorted = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const chartData = {
      labels: sorted.map(x => x[0]),
      datasets: [{
        label: "Patent Filings",
        data: sorted.map(x => x[1]),
        backgroundColor: colors.palette.slice(0, sorted.length),
        borderRadius: 6,
        borderWidth: 0
      }]
    };

    const options = getBaseOptions("Country Filings", colors);
    updateChart(chartId, "bar", chartData, options);
  }

  /**
   * Executive Overview - Pie/Doughnut: Status breakdown
   */
  function renderStatusBreakdown(data, chartId = "execStatusBreakdown") {
    const colors = getThemeColors();
    const statusCounts = { Granted: 0, Published: 0, Pending: 0, Expired: 0 };
    data.forEach(p => {
      if (statusCounts[p.patent_status] !== undefined) {
        statusCounts[p.patent_status]++;
      }
    });

    const statusMapColors = {
      Granted: colors.success,
      Published: colors.info,
      Pending: colors.warning,
      Expired: colors.danger
    };

    const chartData = {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: Object.keys(statusCounts).map(k => statusMapColors[k]),
        borderWidth: 2,
        borderColor: document.body.classList.contains("dark-mode") ? "#0f162a" : "#ffffff"
      }]
    };

    const options = getBaseOptions("Status Breakdown", colors, {
      scales: { x: { display: false }, y: { display: false } },
      cutout: "70%"
    });

    updateChart(chartId, "doughnut", chartData, options);
  }

  /**
   * Executive Overview - Horizontal Bar: Top Applicants
   */
  function renderTopApplicants(data, chartId = "execTopApplicants") {
    const colors = getThemeColors();
    const appCounts = {};
    data.forEach(p => {
      appCounts[p.applicant] = (appCounts[p.applicant] || 0) + 1;
    });

    const sorted = Object.entries(appCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const chartData = {
      labels: sorted.map(x => x[0]),
      datasets: [{
        label: "Patents",
        data: sorted.map(x => x[1]),
        backgroundColor: colors.primary,
        borderRadius: 6,
        barThickness: 20
      }]
    };

    const options = getBaseOptions("Top Applicants", colors, {
      indexAxis: "y",
      scales: {
        x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
        y: { grid: { display: false }, ticks: { color: colors.text } }
      }
    });

    updateChart(chartId, "bar", chartData, options);
  }

  /**
   * Executive Overview - Polar Area: Technology Domains
   */
  function renderDomainDistribution(data, chartId = "execDomainDist") {
    const colors = getThemeColors();
    const domainCounts = {};
    data.forEach(p => {
      domainCounts[p.technology_domain] = (domainCounts[p.technology_domain] || 0) + 1;
    });

    const sorted = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);

    const chartData = {
      labels: sorted.map(x => x[0]),
      datasets: [{
        data: sorted.map(x => x[1]),
        backgroundColor: colors.palette.slice(0, sorted.length).map(c => c + "CC"),
        borderColor: document.body.classList.contains("dark-mode") ? "#0f162a" : "#ffffff",
        borderWidth: 2
      }]
    };

    const options = getBaseOptions("Tech Domains", colors, {
      scales: {
        r: {
          grid: { color: colors.grid },
          angleLines: { color: colors.grid },
          pointLabels: { color: colors.text, font: { family: "Plus Jakarta Sans", size: 9 } },
          ticks: { display: false }
        },
        x: { display: false },
        y: { display: false }
      }
    });

    updateChart(chartId, "polarArea", chartData, options);
  }

  /**
   * Innovation Trends - Stacked Line: Technology growth overtime
   */
  function renderTechDomainGrowth(data, chartId = "trendTechDomainGrowth") {
    const colors = getThemeColors();
    const years = Array.from({length: 11}, (_, i) => 2015 + i);
    const domains = ["Generative AI", "Natural Language Processing", "Computer Vision", "Healthcare AI", "Autonomous Systems"];
    
    const domainData = {};
    domains.forEach(d => {
      domainData[d] = {};
      years.forEach(y => { domainData[d][y] = 0; });
    });

    data.forEach(p => {
      if (domainData[p.technology_domain] && domainData[p.technology_domain][p.filing_year] !== undefined) {
        domainData[p.technology_domain][p.filing_year]++;
      }
    });

    const datasets = domains.map((d, index) => {
      return {
        label: d,
        data: years.map(y => domainData[d][y]),
        borderColor: colors.palette[index],
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3
      };
    });

    const chartData = {
      labels: years.map(String),
      datasets
    };

    const options = getBaseOptions("Tech Growth Profiles", colors);
    updateChart(chartId, "line", chartData, options);
  }

  /**
   * Innovation Trends - Bar: Year-over-Year Growth Rate %
   */
  function renderYoYGrowth(data, chartId = "trendYoYGrowth") {
    const colors = getThemeColors();
    const years = Array.from({length: 11}, (_, i) => 2015 + i);
    const yearlyCounts = {};
    years.forEach(y => { yearlyCounts[y] = 0; });
    data.forEach(p => {
      if (yearlyCounts[p.filing_year] !== undefined) {
        yearlyCounts[p.filing_year]++;
      }
    });

    const yoyData = [];
    const labels = [];
    for (let i = 1; i < years.length; i++) {
      const prev = yearlyCounts[years[i-1]] || 1;
      const curr = yearlyCounts[years[i]];
      const pct = ((curr - prev) / prev) * 100;
      yoyData.push(parseFloat(pct.toFixed(1)));
      labels.push(`${years[i-1]}→${years[i]}`);
    }

    const chartData = {
      labels,
      datasets: [{
        label: "YoY Growth Rate %",
        data: yoyData,
        backgroundColor: yoyData.map(val => val >= 0 ? colors.success : colors.danger),
        borderRadius: 4
      }]
    };

    const options = getBaseOptions("YoY Filings Growth Rate", colors);
    updateChart(chartId, "bar", chartData, options);
  }

  /**
   * Geographic Intelligence - Horizontal Bar: Country Citation Rankings
   */
  function renderCountryCitations(data, chartId = "geoCountryCitations") {
    const colors = getThemeColors();
    const countryCites = {};
    const countryCount = {};
    data.forEach(p => {
      countryCites[p.country] = (countryCites[p.country] || 0) + p.citation_count;
      countryCount[p.country] = (countryCount[p.country] || 0) + 1;
    });

    const averages = Object.keys(countryCites).map(c => {
      return {
        country: c,
        avg: parseFloat((countryCites[c] / countryCount[c]).toFixed(1))
      };
    }).sort((a, b) => b.avg - a.avg).slice(0, 10);

    const chartData = {
      labels: averages.map(x => x.country),
      datasets: [{
        label: "Average Citations per Patent",
        data: averages.map(x => x.avg),
        backgroundColor: colors.info,
        borderRadius: 6,
        barThickness: 18
      }]
    };

    const options = getBaseOptions("Country Citations", colors, {
      indexAxis: "y",
      scales: {
        x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
        y: { grid: { display: false }, ticks: { color: colors.text } }
      }
    });

    updateChart(chartId, "bar", chartData, options);
  }

  /**
   * Applicant Intelligence - Bar: Top Applicants by Citation Impact
   */
  function renderApplicantImpact(data, chartId = "appCitationImpact") {
    const colors = getThemeColors();
    const appCitations = {};
    const appCounts = {};
    data.forEach(p => {
      appCitations[p.applicant] = (appCitations[p.applicant] || 0) + p.citation_count;
      appCounts[p.applicant] = (appCounts[p.applicant] || 0) + 1;
    });

    const averages = Object.keys(appCitations)
      .map(app => ({
        applicant: app,
        avg: parseFloat((appCitations[app] / appCounts[app]).toFixed(1)),
        count: appCounts[app]
      }))
      .filter(x => x.count >= 5)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);

    const chartData = {
      labels: averages.map(x => x.applicant),
      datasets: [{
        label: "Average Citations / Patent",
        data: averages.map(x => x.avg),
        backgroundColor: colors.success,
        borderRadius: 6
      }]
    };

    const options = getBaseOptions("Citation Impact", colors);
    updateChart(chartId, "bar", chartData, options);
  }

  /**
   * Applicant Intelligence - Stacked Bar: Applicant Growth Trend
   */
  function renderApplicantGrowth(data, chartId = "appGrowthTrend") {
    const colors = getThemeColors();
    const periods = ["2015-2018", "2019-2022", "2023-2025"];
    const topApps = ["Google", "Microsoft", "Samsung", "Huawei", "OpenAI", "NVIDIA"];

    const matrix = {};
    topApps.forEach(a => {
      matrix[a] = { "2015-2018": 0, "2019-2022": 0, "2023-2025": 0 };
    });

    data.forEach(p => {
      const app = p.applicant;
      if (matrix[app]) {
        if (p.filing_year <= 2018) {
          matrix[app]["2015-2018"]++;
        } else if (p.filing_year <= 2022) {
          matrix[app]["2019-2022"]++;
        } else {
          matrix[app]["2023-2025"]++;
        }
      }
    });

    const datasets = topApps.map((app, idx) => {
      return {
        label: app,
        data: periods.map(p => matrix[app][p]),
        backgroundColor: colors.palette[idx],
        borderRadius: 4
      };
    });

    const chartData = {
      labels: periods,
      datasets
    };

    const options = getBaseOptions("Applicant Dynamic Growth", colors, {
      scales: {
        x: { grid: { color: colors.grid }, stacked: true },
        y: { grid: { color: colors.grid }, stacked: true }
      }
    });

    updateChart(chartId, "bar", chartData, options);
  }

  /**
   * Technology Intelligence - Bar: IPC Category Distribution
   */
  function renderIpcDistribution(data, chartId = "techIpcDist") {
    const colors = getThemeColors();
    const ipcCounts = {};
    data.forEach(p => {
      ipcCounts[p.ipc_category] = (ipcCounts[p.ipc_category] || 0) + 1;
    });

    const sorted = Object.entries(ipcCounts).sort((a, b) => b[1] - a[1]);

    const chartData = {
      labels: sorted.map(x => x[0]),
      datasets: [{
        label: "Patents",
        data: sorted.map(x => x[1]),
        backgroundColor: colors.primary,
        borderRadius: 6
      }]
    };

    const options = getBaseOptions("IPC Codes", colors);
    updateChart(chartId, "bar", chartData, options);
  }

  /**
   * Technology Intelligence - Polar: Technology Domain Comparison (radar/polar)
   */
  function renderDomainCompareRadar(data, chartId = "techDomainRadar") {
    const colors = getThemeColors();
    const domains = ["Generative AI", "Natural Language Processing", "Computer Vision", "Healthcare AI", "Autonomous Systems", "Cybersecurity AI"];
    
    const domainCounts = {};
    domains.forEach(d => { domainCounts[d] = 0; });
    data.forEach(p => {
      if (domainCounts[p.technology_domain] !== undefined) {
        domainCounts[p.technology_domain]++;
      }
    });

    const chartData = {
      labels: domains,
      datasets: [{
        label: "Current Distribution",
        data: domains.map(d => domainCounts[d]),
        backgroundColor: colors.primary + "33",
        borderColor: colors.primary,
        borderWidth: 2,
        pointBackgroundColor: colors.primary
      }]
    };

    const options = getBaseOptions("Tech Domain Vector", colors, {
      scales: {
        r: {
          grid: { color: colors.grid },
          angleLines: { color: colors.grid },
          pointLabels: { color: colors.text, font: { family: "Plus Jakarta Sans", size: 10, weight: 600 } },
          ticks: { backdropColor: "transparent", color: colors.text }
        },
        x: { display: false },
        y: { display: false }
      }
    });

    updateChart(chartId, "radar", chartData, options);
  }

  /**
   * UPGRADED: McKinsey Strategic Bubble Matrix for Applicants
   * Maps patent count (X), citation impact (Y), and Innovation score (size).
   */
  function renderStrategicMatrix(data, chartId = "appStrategicMatrix") {
    const colors = getThemeColors();
    
    // Group metrics by applicant
    const metrics = InsightsEngine.calculateApplicantRankings(data);
    if (metrics.length === 0) return;

    // We can map coordinates. Let's filter applicants who have at least 1 patent.
    const bubblePoints = metrics.map(m => {
      return {
        x: m.patentCount,
        y: m.citationImpact,
        // Scale Innovation Score for size (min 6, max 30)
        r: Math.min(Math.max(6, m.innovationScore * 0.38), 26),
        label: m.organization,
        score: m.innovationScore
      };
    });

    const chartData = {
      datasets: bubblePoints.map((pt, idx) => ({
        label: pt.label,
        data: [pt],
        backgroundColor: colors.palette[idx % colors.palette.length] + "CC",
        borderColor: colors.palette[idx % colors.palette.length],
        borderWidth: 1.5,
        hoverRadius: pt.r + 4
      }))
    };

    // Calculate dynamic quadrant centers
    const counts = bubblePoints.map(p => p.x);
    const impacts = bubblePoints.map(p => p.y);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const avgImpact = impacts.reduce((a, b) => a + b, 0) / impacts.length;

    // Quadrant visual markings plugin
    const quadrantPlugin = {
      id: 'quadrantPlugin',
      beforeDraw(chart) {
        if (!chart.chartArea) return;
        const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
        const xPos = x.getPixelForValue(avgCount);
        const yPos = y.getPixelForValue(avgImpact);

        ctx.save();
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);

        // Draw cross lines
        ctx.beginPath();
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.moveTo(left, yPos);
        ctx.lineTo(right, yPos);
        ctx.stroke();

        // Add text labels to 4 corners
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 10px Plus Jakarta Sans';
        ctx.setLineDash([]); // reset

        // Top-Right: Market Leaders
        ctx.fillText('Market Leaders (High Vol / High Cite)', right - 200, top + 15);
        // Top-Left: Niche Pioneers
        ctx.fillText('Niche Pioneers (Low Vol / High Cite)', left + 15, top + 15);
        // Bottom-Right: Volumetric Challengers
        ctx.fillText('Volumetric Challengers', right - 130, bottom - 15);
        // Bottom-Left: Incrementalists
        ctx.fillText('Incrementalists', left + 15, bottom - 15);
        ctx.restore();
      }
    };

    const options = getBaseOptions("Strategic Matrix", colors, {
      plugins: {
        legend: { display: true, position: "right" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const pt = context.raw;
              return `${pt.label} | Patents: ${pt.x} | Avg Citations: ${pt.y} | Innovation Score: ${pt.score}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Filing Volume (Patents)", color: colors.text, font: { weight: 'bold' } },
          grid: { color: colors.grid }
        },
        y: {
          title: { display: true, text: "Filing Quality (Avg Citations)", color: colors.text, font: { weight: 'bold' } },
          grid: { color: colors.grid }
        }
      }
    });

    // We pass quadrantPlugin to updates
    if (charts[chartId]) {
      charts[chartId].data = chartData;
      charts[chartId].options = options;
      charts[chartId].update("none");
    } else {
      const ctx = document.getElementById(chartId);
      if (!ctx) return;
      charts[chartId] = new Chart(ctx, {
        type: 'bubble',
        data: chartData,
        options,
        plugins: [quadrantPlugin]
      });
    }
  }

  /**
   * UPGRADED: Country Comparison Line Chart
   * Compares filing trajectory side-by-side for 2 selected countries.
   */
  function renderCountryComparisonChart(data, countryA, countryB, chartId = "geoCompareChart") {
    const colors = getThemeColors();
    const years = Array.from({length: 11}, (_, i) => 2015 + i);

    const countsA = {};
    const countsB = {};
    years.forEach(y => { countsA[y] = 0; countsB[y] = 0; });

    data.forEach(p => {
      if (p.country === countryA) countsA[p.filing_year]++;
      if (p.country === countryB) countsB[p.filing_year]++;
    });

    const chartData = {
      labels: years.map(String),
      datasets: [
        {
          label: countryA,
          data: years.map(y => countsA[y]),
          borderColor: colors.primary,
          backgroundColor: colors.primary + "1A",
          borderWidth: 3,
          fill: true,
          tension: 0.3
        },
        {
          label: countryB,
          data: years.map(y => countsB[y]),
          borderColor: colors.success,
          backgroundColor: colors.success + "1A",
          borderWidth: 3,
          fill: true,
          tension: 0.3
        }
      ]
    };

    const options = getBaseOptions("Comparison Curve", colors);
    updateChart(chartId, "line", chartData, options);
  }

  /**
   * Redraw all active charts on theme toggle
   */
  function forceThemeRedraw(currentData) {
    renderFilingTrends(currentData);
    renderCountryDistribution(currentData);
    renderStatusBreakdown(currentData);
    renderTopApplicants(currentData);
    renderDomainDistribution(currentData);
    renderTechDomainGrowth(currentData);
    renderYoYGrowth(currentData);
    renderCountryCitations(currentData);
    renderApplicantImpact(currentData);
    renderApplicantGrowth(currentData);
    renderIpcDistribution(currentData);
    renderDomainCompareRadar(currentData);
    renderStrategicMatrix(currentData);
  }

  /**
   * Export Chart as PNG
   */
  function exportChartAsPNG(chartId) {
    const chartInstance = charts[chartId];
    if (!chartInstance) return;
    
    const url = chartInstance.toBase64Image();
    const link = document.createElement("a");
    link.download = `${chartId}_export.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    renderFilingTrends,
    renderCountryDistribution,
    renderStatusBreakdown,
    renderTopApplicants,
    renderDomainDistribution,
    renderTechDomainGrowth,
    renderYoYGrowth,
    renderCountryCitations,
    renderApplicantImpact,
    renderApplicantGrowth,
    renderIpcDistribution,
    renderDomainCompareRadar,
    renderStrategicMatrix,
    renderCountryComparisonChart,
    forceThemeRedraw,
    exportChartAsPNG
  };
})();
