/**
 * insights.js
 * Analytical engine that computes dynamic insights, KPIs,
 * and Innovation Scores from the current filtered dataset.
 */

const InsightsEngine = (() => {
  
  /**
   * Helper: Get counts by key
   */
  function getCountsByKey(data, key) {
    const counts = {};
    data.forEach(item => {
      const val = item[key];
      counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }

  /**
   * Calculate Advanced KPIs and general summaries
   */
  function calculateKPIs(filteredData) {
    const total = filteredData.length;
    if (total === 0) {
      return {
        totalPatents: 0,
        activePatents: 0,
        totalCitations: 0,
        avgCitations: 0,
        mostActiveCountry: "N/A",
        fastestGrowingDomain: "N/A",
        highestImpactApplicant: "N/A",
        innovationLeader: "N/A"
      };
    }

    // Active patents (Granted + Published + Pending)
    const active = filteredData.filter(p => p.patent_status !== "Expired").length;

    // Citations
    const totalCitations = filteredData.reduce((sum, p) => sum + p.citation_count, 0);
    const avgCitations = parseFloat((totalCitations / total).toFixed(1));

    // Most Active Country
    const countryCounts = getCountsByKey(filteredData, "country");
    let mostActiveCountry = "N/A";
    let maxCountryCount = -1;
    Object.entries(countryCounts).forEach(([c, count]) => {
      if (count > maxCountryCount) {
        maxCountryCount = count;
        mostActiveCountry = c;
      }
    });

    // Fastest Growing Domain
    // Compares recent period (2022-2025) with baseline period (2015-2020)
    const domainGrowth = {};
    filteredData.forEach(p => {
      const d = p.technology_domain;
      if (!domainGrowth[d]) {
        domainGrowth[d] = { base: 0, recent: 0 };
      }
      if (p.filing_year >= 2021) {
        domainGrowth[d].recent++;
      } else {
        domainGrowth[d].base++;
      }
    });

    let fastestGrowingDomain = "N/A";
    let maxGrowthRate = -999;
    Object.entries(domainGrowth).forEach(([d, counts]) => {
      const base = counts.base || 1; // avoid divide by zero
      const growthRate = (counts.recent - counts.base) / base;
      if (growthRate > maxGrowthRate && counts.recent > 5) {
        maxGrowthRate = growthRate;
        fastestGrowingDomain = d;
      }
    });

    // Highest Impact Applicant (highest average citation count, min 5 patents)
    const appCitations = {};
    filteredData.forEach(p => {
      const app = p.applicant;
      if (!appCitations[app]) {
        appCitations[app] = { count: 0, citations: 0 };
      }
      appCitations[app].count++;
      appCitations[app].citations += p.citation_count;
    });

    let highestImpactApplicant = "N/A";
    let maxAvgCitations = -1;
    Object.entries(appCitations).forEach(([app, data]) => {
      if (data.count >= 5) {
        const avg = data.citations / data.count;
        if (avg > maxAvgCitations) {
          maxAvgCitations = avg;
          highestImpactApplicant = app;
        }
      }
    });

    // Get innovation leader using Innovation Score
    const rankings = calculateApplicantRankings(filteredData);
    const innovationLeader = rankings.length > 0 ? rankings[0].organization : "N/A";

    return {
      totalPatents: total,
      activePatents: active,
      totalCitations,
      avgCitations,
      mostActiveCountry,
      fastestGrowingDomain,
      highestImpactApplicant,
      innovationLeader
    };
  }

  /**
   * Calculate Innovation Score for applicants
   * Score = (0.5 * Patent Count) + (0.3 * Citation Impact) + (0.2 * Domain Diversity)
   */
  function calculateApplicantRankings(filteredData) {
    if (filteredData.length === 0) return [];

    const applicantsData = {};
    filteredData.forEach(p => {
      const app = p.applicant;
      if (!applicantsData[app]) {
        applicantsData[app] = {
          organization: app,
          patentCount: 0,
          citations: 0,
          domains: new Set()
        };
      }
      applicantsData[app].patentCount++;
      applicantsData[app].citations += p.citation_count;
      applicantsData[app].domains.add(p.technology_domain);
    });

    return Object.values(applicantsData).map(item => {
      const citationImpact = parseFloat((item.citations / item.patentCount).toFixed(2));
      const domainDiversity = item.domains.size;
      const score = (0.5 * item.patentCount) + (0.3 * citationImpact) + (0.2 * domainDiversity);
      
      return {
        organization: item.organization,
        patentCount: item.patentCount,
        citations: item.citations,
        citationImpact,
        domainDiversity,
        innovationScore: parseFloat(score.toFixed(2))
      };
    }).sort((a, b) => b.innovationScore - a.innovationScore);
  }

  /**
   * Calculate Innovation Score for countries
   */
  function calculateCountryRankings(filteredData) {
    if (filteredData.length === 0) return [];

    const countryData = {};
    filteredData.forEach(p => {
      const c = p.country;
      if (!countryData[c]) {
        countryData[c] = {
          country: c,
          patentCount: 0,
          citations: 0,
          domains: new Set()
        };
      }
      countryData[c].patentCount++;
      countryData[c].citations += p.citation_count;
      countryData[c].domains.add(p.technology_domain);
    });

    return Object.values(countryData).map(item => {
      const citationImpact = parseFloat((item.citations / item.patentCount).toFixed(2));
      const domainDiversity = item.domains.size;
      const score = (0.5 * item.patentCount) + (0.3 * citationImpact) + (0.2 * domainDiversity);

      return {
        country: item.country,
        patentCount: item.patentCount,
        citations: item.citations,
        citationImpact,
        domainDiversity,
        innovationScore: parseFloat(score.toFixed(2))
      };
    }).sort((a, b) => b.innovationScore - a.innovationScore);
  }

  /**
   * Generate rule-based patent intelligence insights dynamically based on the filtered data
   */
  function generateInsights(filteredData, totalRawCount) {
    const insights = [];
    if (filteredData.length < 10) {
      insights.push({
        type: "info",
        icon: "fa-info-circle",
        text: "Add filters or expand search criteria to generate detailed intelligence insights."
      });
      return insights;
    }

    const total = filteredData.length;
    const countryCounts = getCountsByKey(filteredData, "country");
    const domainCounts = getCountsByKey(filteredData, "technology_domain");
    const applicantCounts = getCountsByKey(filteredData, "applicant");

    // Insight 1: Country Dominance
    let topCountry = "";
    let topCountryCount = 0;
    Object.entries(countryCounts).forEach(([c, cnt]) => {
      if (cnt > topCountryCount) {
        topCountryCount = cnt;
        topCountry = c;
      }
    });
    const countryPct = Math.round((topCountryCount / total) * 100);
    insights.push({
      type: "info",
      icon: "fa-globe",
      text: `${topCountry} leads global patent filings within this view, accounting for a solid ${countryPct}% share.`
    });

    // Insight 2: Fastest Growing tech domain (AI growth)
    const yearDomainCounts = {};
    filteredData.forEach(p => {
      const yr = p.filing_year;
      const dom = p.technology_domain;
      if (!yearDomainCounts[dom]) yearDomainCounts[dom] = { old: 0, recent: 0 };
      if (yr >= 2022) yearDomainCounts[dom].recent++;
      else yearDomainCounts[dom].old++;
    });

    let topGrower = "";
    let maxGrowth = -999;
    Object.entries(yearDomainCounts).forEach(([dom, data]) => {
      const old = data.old || 1;
      const growth = (data.recent - data.old) / old;
      if (growth > maxGrowth && data.recent > 5) {
        maxGrowth = growth;
        topGrower = dom;
      }
    });

    if (topGrower) {
      const growthPercent = Math.round(maxGrowth * 100);
      const isPositive = growthPercent >= 0;
      insights.push({
        type: isPositive ? "growth" : "alert",
        icon: isPositive ? "fa-arrow-trend-up" : "fa-arrow-trend-down",
        text: `${topGrower} represents the fastest-shifting technology vector, with filings changing by ${growthPercent}% compared to previous periods.`
      });
    }

    // Insight 3: Google/Microsoft share
    const googleCount = applicantCounts["Google"] || 0;
    const msCount = applicantCounts["Microsoft"] || 0;
    const combinedPct = Math.round(((googleCount + msCount) / total) * 100);
    if (combinedPct > 0) {
      insights.push({
        type: "info",
        icon: "fa-industry",
        text: `Tech giants Google and Microsoft account for ${combinedPct}% of the patent portfolio in this segment.`
      });
    }

    // Insight 4: High Citation Categories
    const domainCitations = {};
    filteredData.forEach(p => {
      const dom = p.technology_domain;
      if (!domainCitations[dom]) {
        domainCitations[dom] = { count: 0, citations: 0 };
      }
      domainCitations[dom].count++;
      domainCitations[dom].citations += p.citation_count;
    });

    let highestImpactDom = "";
    let highestAvgCites = 0;
    Object.entries(domainCitations).forEach(([dom, data]) => {
      const avg = data.citations / data.count;
      if (avg > highestAvgCites && data.count > 5) {
        highestAvgCites = avg;
        highestImpactDom = dom;
      }
    });

    if (highestImpactDom) {
      insights.push({
        type: "growth",
        icon: "fa-award",
        text: `${highestImpactDom} demonstrates the highest average citation footprint (${highestAvgCites.toFixed(1)} citations per patent), indicating critical downstream academic and commercial impact.`
      });
    }

    // Insight 5: IBM High Impact Check
    const ibmData = filteredData.filter(p => p.applicant === "IBM");
    if (ibmData.length > 0) {
      const ibmTotalCitations = ibmData.reduce((s, p) => s + p.citation_count, 0);
      const ibmAvg = (ibmTotalCitations / ibmData.length).toFixed(1);
      insights.push({
        type: "growth",
        icon: "fa-microchip",
        text: `IBM maintains a strong research profile, securing an average citation impact of ${ibmAvg} references per patent.`
      });
    }

    // Insight 6: Pipeline strength (Pending/Published vs Expired)
    const pendingCount = filteredData.filter(p => p.patent_status === "Pending").length;
    const pendingPct = Math.round((pendingCount / total) * 100);
    insights.push({
      type: "info",
      icon: "fa-clock-rotate-left",
      text: `Pending patent requests comprise ${pendingPct}% of current listings, highlighting a highly active innovation pipeline.`
    });

    return insights;
  }

  return {
    calculateKPIs,
    calculateApplicantRankings,
    calculateCountryRankings,
    generateInsights
  };
})();
