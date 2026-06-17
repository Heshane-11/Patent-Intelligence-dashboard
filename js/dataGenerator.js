/**
 * dataGenerator.js
 * Handles fetching the patent dataset from patents.json or dynamically generating it
 * in memory if CORS prevents fetching (e.g. when opening via file:// protocol).
 */

const PatentData = (() => {
  // Hardcoded config lists to match patents.json structure
  const countries = ["United States", "China", "India", "Germany", "Japan", "South Korea", "United Kingdom", "France", "Canada", "Singapore"];
  const applicants = ["Google", "Microsoft", "IBM", "Samsung", "Huawei", "NVIDIA", "OpenAI", "Tencent", "Amazon", "Meta"];
  const domains = [
    "Generative AI", "Natural Language Processing", "Computer Vision", 
    "Robotics", "Healthcare AI", "Autonomous Systems", 
    "Cybersecurity AI", "Industrial Automation", "Recommendation Systems", "FinTech AI"
  ];
  
  const domainToIpc = {
    "Generative AI": "G06N",
    "Natural Language Processing": "G06F",
    "Computer Vision": "G06F",
    "Robotics": "B25J",
    "Healthcare AI": "A61B",
    "Autonomous Systems": "G01S",
    "Cybersecurity AI": "H04L",
    "Industrial Automation": "G06F",
    "Recommendation Systems": "G06Q",
    "FinTech AI": "G06Q"
  };

  const countryPrefixes = {
    "United States": "US", "China": "CN", "India": "IN", "Germany": "DE", "Japan": "JP",
    "South Korea": "KR", "United Kingdom": "GB", "France": "FR", "Canada": "CA", "Singapore": "SG"
  };

  let rawPatents = [];

  // Helper to generate a lognormal-like random variable in JS
  function randomLognormal(mu, sigma) {
    // Box-Muller transform
    const u1 = 1.0 - Math.random();
    const u2 = 1.0 - Math.random();
    const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    return Math.exp(mu + sigma * randStdNormal);
  }

  function selectWeighted(choices, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < choices.length; i++) {
      r -= weights[i];
      if (r <= 0) return choices[i];
    }
    return choices[choices.length - 1];
  }

  /**
   * Fallback in-memory generator mirroring Python logic
   */
  function generateFallbackData() {
    console.warn("dataGenerator.js: Fetch failed or CORS active. Generating fallback dataset in memory...");
    const data = [];
    const totalRecords = 2250;
    
    // Country weights
    const countryWeights = [0.32, 0.36, 0.06, 0.05, 0.06, 0.07, 0.03, 0.02, 0.02, 0.01];
    
    // Year weights (2015-2025)
    const years = Array.from({length: 11}, (_, i) => 2015 + i);
    const yearWeights = [0.04, 0.04, 0.05, 0.06, 0.08, 0.09, 0.11, 0.13, 0.14, 0.16, 0.10];

    for (let i = 1; i <= totalRecords; i++) {
      const country = selectWeighted(countries, countryWeights);
      const prefix = countryPrefixes[country] || "US";
      const patentId = `${prefix}${20150000 + i}`;
      const filingYear = selectWeighted(years, yearWeights);

      // Domain weights based on year (GenAI explosion post-2020)
      const domainWeights = domains.map(d => {
        if (d === "Generative AI") {
          if (filingYear <= 2018) return 0.01;
          if (filingYear <= 2020) return 0.04;
          if (filingYear <= 2022) return 0.18;
          return 0.32;
        }
        if (d === "Healthcare AI") {
          return filingYear <= 2019 ? 0.05 : 0.12;
        }
        return 0.08;
      });
      const techDomain = selectWeighted(domains, domainWeights);

      // Applicant weights
      const applicantWeights = applicants.map(app => {
        if (app === "OpenAI") {
          if (filingYear >= 2020) return 0.08;
          if (filingYear >= 2017) return 0.01;
          return 0.0;
        }
        if (app === "Google") return 0.15;
        if (app === "Microsoft") return 0.14;
        if (app === "Samsung") return 0.13;
        if (app === "Huawei") return 0.12;
        if (app === "Tencent") return 0.10;
        if (app === "Amazon") return 0.09;
        if (app === "Meta") return 0.08;
        if (app === "IBM") return 0.05;
        if (app === "NVIDIA") return 0.06;
        return 0.05;
      });
      const applicant = selectWeighted(applicants, applicantWeights);

      // IPC Category
      let ipcCategory = domainToIpc[techDomain] || "G06F";
      if (techDomain === "Autonomous Systems" && Math.random() < 0.3) {
        ipcCategory = "H04W";
      } else if (techDomain === "Cybersecurity AI" && Math.random() < 0.2) {
        ipcCategory = "H04W";
      }

      // Citation Count
      let citationCount = 0;
      if (applicant === "IBM") {
        citationCount = Math.floor(randomLognormal(4.1, 0.4));
      } else if ((applicant === "OpenAI" || applicant === "NVIDIA") && techDomain === "Generative AI") {
        citationCount = Math.floor(randomLognormal(3.9, 0.5));
      } else {
        citationCount = Math.floor(randomLognormal(2.4, 0.8));
      }
      citationCount = Math.min(Math.max(0, citationCount), 350);

      // Patent Status
      let patentStatus = "Granted";
      if (filingYear >= 2024) {
        patentStatus = selectWeighted(["Pending", "Published", "Granted"], [0.60, 0.30, 0.10]);
      } else if (filingYear >= 2022) {
        patentStatus = selectWeighted(["Pending", "Published", "Granted"], [0.20, 0.40, 0.40]);
      } else if (filingYear <= 2017) {
        patentStatus = selectWeighted(["Granted", "Expired"], [0.70, 0.30]);
      } else {
        patentStatus = selectWeighted(["Granted", "Published", "Expired"], [0.75, 0.20, 0.05]);
      }

      data.push({
        patent_id: patentId,
        filing_year: filingYear,
        country: country,
        applicant: applicant,
        technology_domain: techDomain,
        ipc_category: ipcCategory,
        citation_count: citationCount,
        patent_status: patentStatus
      });
    }

    return data;
  }

  /**
   * Main loader function. Returns a promise resolving to the dataset.
   */
  async function loadData() {
    try {
      const response = await fetch("data/patents.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      rawPatents = await response.json();
      console.log(`dataGenerator.js: Successfully loaded ${rawPatents.length} records from patents.json`);
    } catch (e) {
      rawPatents = generateFallbackData();
    }
    return rawPatents;
  }

  return {
    loadData,
    getRawData: () => rawPatents,
    getCountries: () => [...countries],
    getApplicants: () => [...applicants],
    getDomains: () => [...domains]
  };
})();
