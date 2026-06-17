/**
 * app.js
 * Main Orchestrator of the Global Patent Intelligence Dashboard.
 * Coordinates data load, filter controls, tab navigation,
 * table sorting, CSV/PDF reports, theme toggles,
 * URL State Serialization, and the Executive Report generator.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Global App State
  const state = {
    allPatents: [],
    filteredPatents: [],
    activeFilters: {
      search: "",
      countries: new Set(),
      applicants: new Set(),
      domains: new Set(),
      statuses: new Set(),
      yearStart: 2015,
      yearEnd: 2025
    },
    activeTab: "overview",
    applicantsSort: {
      key: "score",
      ascending: false
    },
    compareCountryA: "United States",
    compareCountryB: "China"
  };

  // Selectors
  const elements = {
    globalSearch: document.getElementById("globalSearch"),
    yearStart: document.getElementById("yearStart"),
    yearEnd: document.getElementById("yearEnd"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    exportPdfBtn: document.getElementById("exportPdfBtn"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    mobileNavToggle: document.getElementById("mobileNavToggle"),
    sidebar: document.getElementById("sidebar"),
    loadingSkeleton: document.getElementById("loadingSkeleton"),
    tabViews: document.getElementById("tabViews"),
    emptyState: document.getElementById("emptyState"),
    aiInsightsList: document.getElementById("aiInsightsList"),
    geoRankingsTable: document.getElementById("geoRankingsTable").querySelector("tbody"),
    applicantsLeaderboardTable: document.getElementById("applicantsLeaderboardTable"),
    techStrengthsList: document.getElementById("techStrengthsList"),
    techWeaknessesList: document.getElementById("techWeaknessesList"),
    filterPillsRow: document.getElementById("filterPillsRow"),
    
    // Country Comparison Elements
    geoToggleRankings: document.getElementById("geoToggleRankings"),
    geoToggleCompare: document.getElementById("geoToggleCompare"),
    geoRankingsView: document.getElementById("geoRankingsView"),
    geoCompareView: document.getElementById("geoCompareView"),
    compareCountryA: document.getElementById("compareCountryA"),
    compareCountryB: document.getElementById("compareCountryB"),
    compareTitleA: document.getElementById("compareTitleA"),
    compareTitleB: document.getElementById("compareTitleB"),
    comparePatentsA: document.getElementById("comparePatentsA"),
    comparePatentsB: document.getElementById("comparePatentsB"),
    compareCitationsA: document.getElementById("compareCitationsA"),
    compareCitationsB: document.getElementById("compareCitationsB"),
    compareScoreA: document.getElementById("compareScoreA"),
    compareScoreB: document.getElementById("compareScoreB"),
    geoCompareTable: document.getElementById("geoCompareTable").querySelector("tbody"),
    compareColHeaderA: document.getElementById("compareColHeaderA"),
    compareColHeaderB: document.getElementById("compareColHeaderB"),

    // Executive Report Elements
    openReportBtn: document.getElementById("openReportBtn"),
    reportModal: document.getElementById("reportModal"),
    closeReportBtn: document.getElementById("closeReportBtn"),
    closeReportBtnSecondary: document.getElementById("closeReportBtnSecondary"),
    downloadReportPdfBtn: document.getElementById("downloadReportPdfBtn"),
    reportPaperArea: document.getElementById("reportPaperArea"),
    reportFilterText: document.getElementById("reportFilterText"),
    reportDateText: document.getElementById("reportDateText"),
    repTotalPatents: document.getElementById("repTotalPatents"),
    repLeadingCountry: document.getElementById("repLeadingCountry"),
    repLeadingApp: document.getElementById("repLeadingApp"),
    repFastestTech: document.getElementById("repFastestTech"),
    repInsightsContainer: document.getElementById("repInsightsContainer"),
    repStandingsTable: document.getElementById("repStandingsTable").querySelector("tbody")
  };

  // Custom Dropdown Configurations
  const filtersConfig = [
    { triggerId: "countryFilter", optionsId: "countryOptions", key: "countries", listFunc: PatentData.getCountries },
    { triggerId: "applicantFilter", optionsId: "applicantOptions", key: "applicants", listFunc: PatentData.getApplicants },
    { triggerId: "techFilter", optionsId: "techOptions", key: "domains", listFunc: PatentData.getDomains },
    { triggerId: "statusFilter", optionsId: "statusOptions", key: "statuses", listFunc: () => ["Granted", "Published", "Pending", "Expired"] }
  ];

  /* ==========================================================================
     Theme & Persistent Configurations
     ========================================================================== */
  function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    const isDark = savedTheme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    updateThemeButtonUI(isDark);
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeButtonUI(isDark);
    ChartManager.forceThemeRedraw(state.filteredPatents);
  }

  function updateThemeButtonUI(isDark) {
    const icon = elements.themeToggleBtn.querySelector("i");
    const label = elements.themeToggleBtn.querySelector("span");
    icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    label.textContent = isDark ? "Light Mode" : "Dark Mode";
  }

  /* ==========================================================================
     URL State Serialization & Bookmarking
     ========================================================================== */
  function serializeFiltersToURL() {
    const params = new URLSearchParams();
    const filters = state.activeFilters;

    if (filters.search) params.set("q", filters.search);
    if (filters.countries.size > 0) params.set("countries", Array.from(filters.countries).join(","));
    if (filters.applicants.size > 0) params.set("applicants", Array.from(filters.applicants).join(","));
    if (filters.domains.size > 0) params.set("domains", Array.from(filters.domains).join(","));
    if (filters.statuses.size > 0) params.set("statuses", Array.from(filters.statuses).join(","));
    if (filters.yearStart !== 2015) params.set("start", filters.yearStart);
    if (filters.yearEnd !== 2025) params.set("end", filters.yearEnd);
    if (state.activeTab !== "overview") params.set("tab", state.activeTab);

    const newURL = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({ path: newURL }, "", newURL);
  }

  function deserializeFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const filters = state.activeFilters;

    if (params.has("q")) {
      filters.search = params.get("q");
      elements.globalSearch.value = filters.search;
    }
    
    const arrayFilters = ["countries", "applicants", "domains", "statuses"];
    arrayFilters.forEach(key => {
      if (params.has(key)) {
        params.get(key).split(",").forEach(item => filters[key].add(item));
      }
    });

    if (params.has("start")) {
      filters.yearStart = parseInt(params.get("start")) || 2015;
      elements.yearStart.value = filters.yearStart;
    }
    if (params.has("end")) {
      filters.yearEnd = parseInt(params.get("end")) || 2025;
      elements.yearEnd.value = filters.yearEnd;
    }
    if (params.has("tab")) {
      state.activeTab = params.get("tab");
      document.querySelectorAll(".sidebar-menu .menu-item").forEach(menu => {
        menu.classList.toggle("active", menu.getAttribute("data-tab") === state.activeTab);
      });
    }

    // Sync triggers and UI checkboxes
    filtersConfig.forEach(cfg => {
      updateTriggerLabel(cfg.triggerId, filters[cfg.key], cfg.key);
    });
  }

  /* ==========================================================================
     Interactive Filter Pills UI
     ========================================================================== */
  function renderFilterPills() {
    const container = elements.filterPillsRow;
    container.innerHTML = "";
    
    let hasPills = false;
    const filters = state.activeFilters;

    const addPill = (label, filterSet, value) => {
      hasPills = true;
      const pill = document.createElement("span");
      pill.className = "filter-pill";
      pill.innerHTML = `${label}: ${value} <i class="fa-solid fa-xmark"></i>`;
      pill.querySelector("i").addEventListener("click", () => {
        filterSet.delete(value);
        // Deselect corresponding checkbox
        const checkboxId = `${triggerIdFor(filterSet)}_${value.replace(/\s+/g, "_")}`;
        const cb = document.getElementById(checkboxId);
        if (cb) cb.checked = false;
        
        updateTriggerLabel(triggerIdFor(filterSet), filterSet, filterKeyFor(filterSet));
        applyFiltersAndRender();
      });
      container.appendChild(pill);
    };

    // Render country pills
    filters.countries.forEach(val => addPill("Country", filters.countries, val));
    filters.applicants.forEach(val => addPill("Applicant", filters.applicants, val));
    filters.domains.forEach(val => addPill("Tech", filters.domains, val));
    filters.statuses.forEach(val => addPill("Status", filters.statuses, val));

    // Show/hide pills row
    container.style.display = hasPills ? "flex" : "none";
  }

  function triggerIdFor(set) {
    if (set === state.activeFilters.countries) return "countryFilter";
    if (set === state.activeFilters.applicants) return "applicantFilter";
    if (set === state.activeFilters.domains) return "techFilter";
    return "statusFilter";
  }

  function filterKeyFor(set) {
    if (set === state.activeFilters.countries) return "countries";
    if (set === state.activeFilters.applicants) return "applicants";
    if (set === state.activeFilters.domains) return "domains";
    return "statuses";
  }

  /* ==========================================================================
     Custom Dropdown Filter Populator
     ========================================================================== */
  function initFilterDropdowns() {
    filtersConfig.forEach(cfg => {
      const trigger = document.getElementById(cfg.triggerId);
      const optionsContainer = document.getElementById(cfg.optionsId);
      const items = cfg.listFunc();

      optionsContainer.innerHTML = "";

      trigger.querySelector(".custom-select-trigger").addEventListener("click", (e) => {
        e.stopPropagation();
        filtersConfig.forEach(other => {
          if (other.triggerId !== cfg.triggerId) {
            document.getElementById(other.optionsId).classList.remove("open");
          }
        });
        optionsContainer.classList.toggle("open");
      });

      items.forEach(item => {
        const optionItem = document.createElement("div");
        optionItem.className = "option-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = item;
        checkbox.id = `${cfg.triggerId}_${item.replace(/\s+/g, "_")}`;

        // Match checkbox status if populated from URL state
        if (state.activeFilters[cfg.key].has(item)) {
          checkbox.checked = true;
        }

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.textContent = item;

        optionItem.appendChild(checkbox);
        optionItem.appendChild(label);
        optionsContainer.appendChild(optionItem);

        optionItem.addEventListener("click", (e) => {
          if (e.target.tagName !== "INPUT") {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event("change"));
          }
        });

        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            state.activeFilters[cfg.key].add(item);
          } else {
            state.activeFilters[cfg.key].delete(item);
          }
          updateTriggerLabel(cfg.triggerId, state.activeFilters[cfg.key], cfg.key);
          applyFiltersAndRender();
        });
      });
    });

    document.addEventListener("click", () => {
      filtersConfig.forEach(cfg => {
        document.getElementById(cfg.optionsId).classList.remove("open");
      });
    });
  }

  function updateTriggerLabel(triggerId, set, filterKey) {
    const trigger = document.getElementById(triggerId);
    const textSpan = trigger.querySelector(".custom-select-trigger span");
    if (set.size === 0) {
      const defaultLabels = {
        countries: "All Countries",
        applicants: "All Applicants",
        domains: "All Technologies",
        statuses: "All Statuses"
      };
      textSpan.textContent = defaultLabels[filterKey];
    } else if (set.size === 1) {
      textSpan.textContent = Array.from(set)[0];
    } else {
      textSpan.textContent = `${set.size} Selected`;
    }
  }

  function resetAllFiltersUI() {
    state.activeFilters.search = "";
    elements.globalSearch.value = "";
    state.activeFilters.countries.clear();
    state.activeFilters.applicants.clear();
    state.activeFilters.domains.clear();
    state.activeFilters.statuses.clear();
    state.activeFilters.yearStart = 2015;
    state.activeFilters.yearEnd = 2025;
    elements.yearStart.value = 2015;
    elements.yearEnd.value = 2025;

    filtersConfig.forEach(cfg => {
      updateTriggerLabel(cfg.triggerId, state.activeFilters[cfg.key], cfg.key);
      const container = document.getElementById(cfg.optionsId);
      container.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.checked = false;
      });
    });

    applyFiltersAndRender();
  }

  /* ==========================================================================
     Filtering Algorithms & Pipeline
     ========================================================================== */
  function applyFiltersAndRender() {
    const filters = state.activeFilters;
    const query = filters.search.toLowerCase().trim();

    state.filteredPatents = state.allPatents.filter(p => {
      if (query) {
        const idMatch = p.patent_id.toLowerCase().includes(query);
        const appMatch = p.applicant.toLowerCase().includes(query);
        const domainMatch = p.technology_domain.toLowerCase().includes(query);
        const ipcMatch = p.ipc_category.toLowerCase().includes(query);
        const countryMatch = p.country.toLowerCase().includes(query);
        if (!idMatch && !appMatch && !domainMatch && !ipcMatch && !countryMatch) {
          return false;
        }
      }

      if (filters.countries.size > 0 && !filters.countries.has(p.country)) return false;
      if (filters.applicants.size > 0 && !filters.applicants.has(p.applicant)) return false;
      if (filters.domains.size > 0 && !filters.domains.has(p.technology_domain)) return false;
      if (filters.statuses.size > 0 && !filters.statuses.has(p.patent_status)) return false;

      if (p.filing_year < filters.yearStart || p.filing_year > filters.yearEnd) return false;

      return true;
    });

    // Save state to URL parameters
    serializeFiltersToURL();

    // Render filter pills
    renderFilterPills();

    // Check empty-state
    if (state.filteredPatents.length === 0) {
      elements.tabViews.style.display = "none";
      elements.emptyState.style.display = "flex";
      updateKPICards(state.filteredPatents);
    } else {
      elements.tabViews.style.display = "block";
      elements.emptyState.style.display = "none";
      renderActiveTab();
    }
  }

  /* ==========================================================================
     KPI Counter Animation
     ========================================================================== */
  function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const val = Math.floor(progress * (end - start) + start);
      obj.innerHTML = val.toLocaleString();
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  function updateKPICards(filtered) {
    const kpis = InsightsEngine.calculateKPIs(filtered);
    
    const totalPatentsEl = document.getElementById("kpiTotalPatents");
    const activePatentsEl = document.getElementById("kpiActivePatents");
    const totalCitationsEl = document.getElementById("kpiTotalCitations");
    
    if (filtered.length > 0) {
      animateValue(totalPatentsEl, 0, kpis.totalPatents, 400);
      animateValue(activePatentsEl, 0, kpis.activePatents, 400);
      animateValue(totalCitationsEl, 0, kpis.totalCitations, 400);
    } else {
      totalPatentsEl.innerHTML = "0";
      activePatentsEl.innerHTML = "0";
      totalCitationsEl.innerHTML = "0";
    }

    document.getElementById("kpiTotalPatentsChange").querySelector("span").textContent = 
      filtered.length > 0 ? `+${Math.round(kpis.totalPatents * 0.12)} YoY` : "--";
      
    document.getElementById("kpiActivePatentsPct").querySelector("span").textContent = 
      filtered.length > 0 ? `${Math.round((kpis.activePatents / kpis.totalPatents) * 100)}%` : "--";
      
    document.getElementById("kpiAvgCitations").querySelector("span").textContent = 
      filtered.length > 0 ? `${kpis.avgCitations}` : "--";

    document.getElementById("kpiMostActiveCountry").textContent = kpis.mostActiveCountry;
    document.getElementById("kpiFastestGrowing").textContent = kpis.fastestGrowingDomain;
    document.getElementById("kpiHighestImpact").textContent = kpis.highestImpactApplicant;
    document.getElementById("kpiInnovationLeader").textContent = kpis.innovationLeader;
  }

  /* ==========================================================================
     Page Tab Rendering Coordinates
     ========================================================================== */
  function renderActiveTab() {
    const filtered = state.filteredPatents;
    updateKPICards(filtered);

    document.querySelectorAll(".tab-content").forEach(el => {
      el.classList.remove("active");
    });
    document.getElementById(`${state.activeTab}Tab`).classList.add("active");

    if (state.activeTab === "overview") {
      renderPatentInsights(filtered);
      ChartManager.renderFilingTrends(filtered);
      ChartManager.renderCountryDistribution(filtered);
      ChartManager.renderStatusBreakdown(filtered);
      ChartManager.renderTopApplicants(filtered);
      ChartManager.renderDomainDistribution(filtered);
      
    } else if (state.activeTab === "trends") {
      ChartManager.renderTechDomainGrowth(filtered);
      ChartManager.renderYoYGrowth(filtered);
      
    } else if (state.activeTab === "geographic") {
      ChartManager.renderCountryCitations(filtered);
      renderGeoRankingTable(filtered);
      renderCountryComparisonView();
      
    } else if (state.activeTab === "applicants") {
      ChartManager.renderApplicantImpact(filtered);
      ChartManager.renderApplicantGrowth(filtered);
      ChartManager.renderStrategicMatrix(filtered); // Upgraded McKinsey Matrix
      renderApplicantsLeaderboard(filtered);
      
    } else if (state.activeTab === "technology") {
      ChartManager.renderIpcDistribution(filtered);
      ChartManager.renderDomainCompareRadar(filtered);
      renderTechnologyDomainSummary(filtered);
    }
  }

  /* ==========================================================================
     Tab Sub-Component Generators (DocumentFragments Optimized)
     ========================================================================== */
  function renderPatentInsights(filtered) {
    const list = elements.aiInsightsList;
    list.innerHTML = "";
    const insights = InsightsEngine.generateInsights(filtered, state.allPatents.length);
    
    const frag = document.createDocumentFragment();
    insights.forEach(ins => {
      const item = document.createElement("div");
      item.className = `insight-bullet ${ins.type}`;
      item.innerHTML = `<i class="fa-solid ${ins.icon}"></i> <span>${ins.text}</span>`;
      frag.appendChild(item);
    });
    list.appendChild(frag);
  }

  function renderGeoRankingTable(filtered) {
    const tbody = elements.geoRankingsTable;
    tbody.innerHTML = "";
    const rankings = InsightsEngine.calculateCountryRankings(filtered);

    const frag = document.createDocumentFragment();
    rankings.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="rank-badge">${idx + 1}</span></td>
        <td><strong>${r.country}</strong></td>
        <td>${r.patentCount.toLocaleString()}</td>
        <td>${r.citations.toLocaleString()}</td>
        <td>${r.citationImpact}</td>
        <td class="score-cell">${r.innovationScore}</td>
      `;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  function renderApplicantsLeaderboard(filtered) {
    const tbody = elements.applicantsLeaderboardTable.querySelector("tbody");
    tbody.innerHTML = "";
    
    let rankings = InsightsEngine.calculateApplicantRankings(filtered);
    
    const { key, ascending } = state.applicantsSort;
    rankings.sort((a, b) => {
      let valA, valB;
      if (key === "rank") return 0;
      if (key === "org") { valA = a.organization; valB = b.organization; }
      else if (key === "patents") { valA = a.patentCount; valB = b.patentCount; }
      else if (key === "citations") { valA = a.citations; valB = b.citations; }
      else if (key === "impact") { valA = a.citationImpact; valB = b.citationImpact; }
      else if (key === "diversity") { valA = a.domainDiversity; valB = b.domainDiversity; }
      else { valA = a.innovationScore; valB = b.innovationScore; }

      if (typeof valA === "string") {
        return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return ascending ? valA - valB : valB - valA;
    });

    const frag = document.createDocumentFragment();
    rankings.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="rank-badge">${idx + 1}</span></td>
        <td class="org-name">${r.organization}</td>
        <td>${r.patentCount}</td>
        <td>${r.citations.toLocaleString()}</td>
        <td>${r.citationImpact}</td>
        <td>${r.domainDiversity} / 10</td>
        <td class="score-cell">${r.innovationScore}</td>
      `;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  function renderTechnologyDomainSummary(filtered) {
    const strList = elements.techStrengthsList;
    const weakList = elements.techWeaknessesList;
    strList.innerHTML = "";
    weakList.innerHTML = "";

    const domainsData = {};
    filtered.forEach(p => {
      const d = p.technology_domain;
      if (!domainsData[d]) domainsData[d] = { count: 0, cites: 0 };
      domainsData[d].count++;
      domainsData[d].cites += p.citation_count;
    });

    const domainsArr = Object.keys(domainsData).map(d => {
      return {
        name: d,
        count: domainsData[d].count,
        impact: parseFloat((domainsData[d].cites / domainsData[d].count).toFixed(1))
      };
    });

    const topPerformers = [...domainsArr].sort((a, b) => b.count - a.count).slice(0, 3);
    const topFrag = document.createDocumentFragment();
    topPerformers.forEach(x => {
      const li = document.createElement("li");
      li.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right: 8px;"></i> <strong>${x.name}</strong>: ${x.count} patents (Citation Index: ${x.impact})`;
      topFrag.appendChild(li);
    });
    strList.appendChild(topFrag);

    const slowPerformers = [...domainsArr].sort((a, b) => a.count - b.count).slice(0, 3);
    const slowFrag = document.createDocumentFragment();
    slowPerformers.forEach(x => {
      const li = document.createElement("li");
      li.innerHTML = `<i class="fa-solid fa-circle-minus" style="margin-right: 8px;"></i> <strong>${x.name}</strong>: ${x.count} patents (Citation Index: ${x.impact})`;
      slowFrag.appendChild(li);
    });
    weakList.appendChild(slowFrag);
  }

  /* ==========================================================================
     UPGRADED: Country Comparison View Orchestrator
     ========================================================================== */
  function initCountryComparisonDropdowns() {
    const countries = PatentData.getCountries();
    
    // Clear and populate Country Selectors
    elements.compareCountryA.innerHTML = "";
    elements.compareCountryB.innerHTML = "";

    countries.forEach(c => {
      const optA = document.createElement("option");
      optA.value = c;
      optA.textContent = c;
      if (c === state.compareCountryA) optA.selected = true;
      elements.compareCountryA.appendChild(optA);

      const optB = document.createElement("option");
      optB.value = c;
      optB.textContent = c;
      if (c === state.compareCountryB) optB.selected = true;
      elements.compareCountryB.appendChild(optB);
    });

    // Event listeners
    elements.compareCountryA.addEventListener("change", (e) => {
      state.compareCountryA = e.target.value;
      renderCountryComparisonView();
    });
    elements.compareCountryB.addEventListener("change", (e) => {
      state.compareCountryB = e.target.value;
      renderCountryComparisonView();
    });
  }

  function renderCountryComparisonView() {
    const filtered = state.filteredPatents;
    const countryA = state.compareCountryA;
    const countryB = state.compareCountryB;

    // Filter subsets
    const patentsA = filtered.filter(p => p.country === countryA);
    const patentsB = filtered.filter(p => p.country === countryB);

    // Compute metrics A
    const citesA = patentsA.reduce((sum, p) => sum + p.citation_count, 0);
    const avgCitesA = patentsA.length > 0 ? parseFloat((citesA / patentsA.length).toFixed(1)) : 0;
    const uniqueDomsA = new Set(patentsA.map(p => p.technology_domain)).size;
    const scoreA = parseFloat(((0.5 * patentsA.length) + (0.3 * avgCitesA) + (0.2 * uniqueDomsA)).toFixed(1));

    // Compute metrics B
    const citesB = patentsB.reduce((sum, p) => sum + p.citation_count, 0);
    const avgCitesB = patentsB.length > 0 ? parseFloat((citesB / patentsB.length).toFixed(1)) : 0;
    const uniqueDomsB = new Set(patentsB.map(p => p.technology_domain)).size;
    const scoreB = parseFloat(((0.5 * patentsB.length) + (0.3 * avgCitesB) + (0.2 * uniqueDomsB)).toFixed(1));

    // Update DOM texts
    elements.compareTitleA.textContent = countryA;
    elements.compareTitleB.textContent = countryB;
    elements.compareColHeaderA.textContent = countryA;
    elements.compareColHeaderB.textContent = countryB;

    elements.comparePatentsA.textContent = patentsA.length.toLocaleString();
    elements.compareCitationsA.textContent = avgCitesA;
    elements.compareScoreA.textContent = scoreA;

    elements.comparePatentsB.textContent = patentsB.length.toLocaleString();
    elements.compareCitationsB.textContent = avgCitesB;
    elements.compareScoreB.textContent = scoreB;

    // Render comparison line chart
    ChartManager.renderCountryComparisonChart(filtered, countryA, countryB);

    // Render tech domain comparison table
    elements.geoCompareTable.innerHTML = "";
    const domains = PatentData.getDomains();
    const tableFrag = document.createDocumentFragment();

    domains.forEach(dom => {
      const countA = patentsA.filter(p => p.technology_domain === dom).length;
      const countB = patentsB.filter(p => p.technology_domain === dom).length;
      const variance = countA - countB;
      const varColor = variance > 0 ? "color: var(--color-success);" : (variance < 0 ? "color: var(--color-danger);" : "");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${dom}</strong></td>
        <td>${countA}</td>
        <td>${countB}</td>
        <td style="font-weight: 700; ${varColor}">${variance > 0 ? "+" : ""}${variance}</td>
      `;
      tableFrag.appendChild(tr);
    });
    elements.geoCompareTable.appendChild(tableFrag);
  }

  /* ==========================================================================
     NEW FEATURE: Executive Innovation Report Modal Handlers
     ========================================================================== */
  function openExecutiveReport() {
    const filtered = state.filteredPatents;
    const kpis = InsightsEngine.calculateKPIs(filtered);
    const rankings = InsightsEngine.calculateApplicantRankings(filtered);

    // Set Date & Filters
    elements.reportDateText.textContent = new Date().toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    
    // Description text
    let filterSummary = "Global Patent Portfolio";
    if (state.activeFilters.countries.size > 0) {
      filterSummary = `Regions: ${Array.from(state.activeFilters.countries).join(", ")}`;
    }
    elements.reportFilterText.textContent = filterSummary;

    // Fill KPIs
    elements.repTotalPatents.textContent = kpis.totalPatents.toLocaleString();
    elements.repLeadingCountry.textContent = kpis.mostActiveCountry;
    elements.repLeadingApp.textContent = kpis.innovationLeader;
    elements.repFastestTech.textContent = kpis.fastestGrowingDomain;

    // Fill Insights (take up to 3 for clean fit on page)
    const insights = InsightsEngine.generateInsights(filtered, state.allPatents.length).slice(0, 3);
    elements.repInsightsContainer.innerHTML = "";
    insights.forEach(ins => {
      const div = document.createElement("div");
      div.className = "report-insight-item";
      div.innerHTML = `<i class="fa-solid fa-square-poll-horizontal"></i> <span>${ins.text}</span>`;
      elements.repInsightsContainer.appendChild(div);
    });

    // Fill Top 5 standouts
    elements.repStandingsTable.innerHTML = "";
    rankings.slice(0, 5).forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td><strong>${r.organization}</strong></td>
        <td>${r.patentCount}</td>
        <td>${r.citations.toLocaleString()}</td>
        <td style="font-weight:700; color:#2563eb;">${r.innovationScore}</td>
      `;
      elements.repStandingsTable.appendChild(tr);
    });

    // Open Modal
    elements.reportModal.classList.add("open");
  }

  function closeExecutiveReport() {
    elements.reportModal.classList.remove("open");
  }

  async function downloadReportPDF() {
    const { jsPDF } = window.jspdf;
    const btn = elements.downloadReportPdfBtn;
    const orig = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Exporting PDF...`;
    btn.disabled = true;

    try {
      const paperArea = document.getElementById("reportPaperArea");
      const canvas = await html2canvas(paperArea, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgWidth = 190; // Fit margins nicely
      const margin = 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
      pdf.save(`wipo_executive_innovation_report_${Date.now()}.pdf`);
      closeExecutiveReport();
    } catch (err) {
      console.error("PDF Report failed:", err);
      alert("Failed to build PDF document.");
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  }

  /* ==========================================================================
     Export Handlers (CSV & Main PDF Page)
     ========================================================================== */
  function exportCSV() {
    const data = state.filteredPatents;
    if (data.length === 0) return;

    const headers = ["Patent ID", "Filing Year", "Country", "Applicant", "Tech Domain", "IPC Category", "Citations", "Status"];
    const rows = data.map(p => [
      p.patent_id,
      p.filing_year,
      p.country,
      `"${p.applicant}"`,
      `"${p.technology_domain}"`,
      p.ipc_category,
      p.citation_count,
      p.patent_status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wipo_patent_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function exportPagePDF() {
    const { jsPDF } = window.jspdf;
    const btn = elements.exportPdfBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Printing PDF...`;
    btn.disabled = true;

    try {
      const captureArea = document.getElementById("captureArea");
      const hasDark = document.body.classList.contains("dark-mode");
      if (hasDark) {
        document.body.classList.remove("dark-mode");
        ChartManager.forceThemeRedraw(state.filteredPatents);
      }

      const canvas = await html2canvas(captureArea, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      if (hasDark) {
        document.body.classList.add("dark-mode");
        ChartManager.forceThemeRedraw(state.filteredPatents);
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`wipo_dashboard_report_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF page print failed:", err);
      alert("Failed to render full page PDF.");
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  /* ==========================================================================
     Events & Bootstrapping
     ========================================================================== */
  function bindEvents() {
    // Sidebar Tab Navigation
    document.querySelectorAll(".sidebar-menu .menu-item").forEach(menu => {
      menu.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll(".sidebar-menu .menu-item").forEach(m => m.classList.remove("active"));
        menu.classList.add("active");
        
        state.activeTab = menu.getAttribute("data-tab");
        renderActiveTab();
        serializeFiltersToURL();
        elements.sidebar.classList.remove("open");
      });
    });

    // Mobile Navigation Toggle
    elements.mobileNavToggle.addEventListener("click", () => {
      elements.sidebar.classList.toggle("open");
    });

    // Theme Switch
    elements.themeToggleBtn.addEventListener("click", toggleTheme);

    // Global Search (Debounced)
    let searchDebounce;
    elements.globalSearch.addEventListener("input", (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        state.activeFilters.search = e.target.value;
        applyFiltersAndRender();
      }, 250);
    });

    // Year range selectors
    elements.yearStart.addEventListener("change", (e) => {
      state.activeFilters.yearStart = parseInt(e.target.value) || 2015;
      applyFiltersAndRender();
    });
    elements.yearEnd.addEventListener("change", (e) => {
      state.activeFilters.yearEnd = parseInt(e.target.value) || 2025;
      applyFiltersAndRender();
    });

    // Reset button
    elements.resetFiltersBtn.addEventListener("click", resetAllFiltersUI);

    // Dynamic sorting for Leaderboard headers
    elements.applicantsLeaderboardTable.querySelectorAll("th").forEach(th => {
      th.addEventListener("click", () => {
        const sortKey = th.getAttribute("data-sort");
        if (state.applicantsSort.key === sortKey) {
          state.applicantsSort.ascending = !state.applicantsSort.ascending;
        } else {
          state.applicantsSort.key = sortKey;
          state.applicantsSort.ascending = false;
        }

        elements.applicantsLeaderboardTable.querySelectorAll("th i").forEach(icon => {
          icon.className = "fa-solid fa-sort";
        });
        const activeIcon = th.querySelector("i");
        activeIcon.className = state.applicantsSort.ascending 
          ? "fa-solid fa-sort-up" 
          : "fa-solid fa-sort-down";

        renderApplicantsLeaderboard(state.filteredPatents);
      });
    });

    // Country comparison tab page toggler
    elements.geoToggleRankings.addEventListener("click", () => {
      elements.geoToggleCompare.classList.remove("active");
      elements.geoToggleRankings.classList.add("active");
      elements.geoCompareView.style.display = "none";
      elements.geoRankingsView.style.display = "block";
    });

    elements.geoToggleCompare.addEventListener("click", () => {
      elements.geoToggleRankings.classList.remove("active");
      elements.geoToggleCompare.classList.add("active");
      elements.geoRankingsView.style.display = "none";
      elements.geoCompareView.style.display = "block";
      renderCountryComparisonView();
    });

    // Executive report bindings
    elements.openReportBtn.addEventListener("click", openExecutiveReport);
    elements.closeReportBtn.addEventListener("click", closeExecutiveReport);
    elements.closeReportBtnSecondary.addEventListener("click", closeExecutiveReport);
    elements.downloadReportPdfBtn.addEventListener("click", downloadReportPDF);

    // General PDF / CSV triggers
    elements.exportCsvBtn.addEventListener("click", exportCSV);
    elements.exportPdfBtn.addEventListener("click", exportPagePDF);
  }

  // Initial Bootloader
  async function initializeApp() {
    elements.loadingSkeleton.style.display = "block";
    elements.tabViews.style.display = "none";

    try {
      initTheme();
      
      // Fetch patent records
      state.allPatents = await PatentData.loadData();
      state.filteredPatents = [...state.allPatents];

      // Parse parameters from URL on load
      deserializeFiltersFromURL();

      // Initiate filter UI lists & comparative country nodes
      initFilterDropdowns();
      initCountryComparisonDropdowns();
      bindEvents();

      elements.loadingSkeleton.style.display = "none";
      elements.tabViews.style.display = "block";
      
      // Perform initial render pipeline
      applyFiltersAndRender();
    } catch (err) {
      console.error("Critical Dashboard Startup failure:", err);
    }
  }

  initializeApp();
});
