# Global Patent Intelligence Platform

A high-performance, enterprise-grade innovation analytics dashboard inspired by **WIPO, OECD, USPTO,** and **World Bank** data explorer portals. This platform delivers deep analytical insights into global patenting trends, geographic distributions, organizational performance, and technological specializations from 2015 to 2025.

---

## 🚀 Key Features

* **Interactive Executive Dashboard**: 8 animated KPI metrics (counters) and a rule-based AI Insights Engine summarizing current vectors.
* **5 Dedicated Intelligence Views**:
  1. **Executive Overview**: High-level trends, national shares, lifecycles, and main applicants.
  2. **Innovation Trends**: Multi-dimensional growth models and YoY rates.
  3. **Geographic Intelligence**: National citation index scores and sorted table matrices.
  4. **Applicant Intelligence**: Dynamic innovator leaderboard featuring custom **WIPO Innovation Scores**.
  5. **Technology Intelligence**: IPC code frequencies, domain comparison radar plots, and strength/weakness indices.
* **Advanced Controls & Interactions**:
  * Cross-filtering: Filter by Country, Applicant, Technology Domain, and Patent Status.
  * Year range slider constraints.
  * Debounced global search across ID, Applicant, Domain, IPC, and Country.
* **Enterprise Reporting Exports**:
  * Save individual charts as high-resolution PNGs.
  * Export the active filtered dataset directly to CSV.
  * Export the entire dashboard view into a formatted PDF document.
* **Responsive Dark / Light Themes**: Adaptive visualization palettes with persisted state via localStorage.
* **Resilient Architecture**: Fallback mock generator that runs client-side if file-protocol CORS limits block fetch requests.

---

## 📊 Dataset Description

The system includes a pre-generated, realistic dataset of **2,250 patent records** stored in `data/patents.json`.
* **Field Structure**:
  ```json
  {
    "patent_id": "US20150001",
    "filing_year": 2023,
    "country": "United States",
    "applicant": "Google",
    "technology_domain": "Generative AI",
    "ipc_category": "G06N",
    "citation_count": 45,
    "patent_status": "Granted"
  }
  ```
* **Distribution Properties**:
  * **Generative AI** filings display an exponential surge post-2020.
  * **United States** and **China** dominate total filing volume (approx. 68% combined).
  * **IBM** exhibits lower patent volume but high citation averages, representing pioneering breakthrough patents.
  * **OpenAI** and **NVIDIA** display high citation averages concentrated in Generative AI since 2020.

---

## 🛠️ Technology Stack

* **Structure**: HTML5 Semantic Architecture
* **Styling**: Vanilla CSS3 (Custom Grid layouts, CSS Variables, Glassmorphism, animations)
* **Visualization Engine**: [Chart.js (v4.x)](https://www.chartjs.org/)
* **Exporting Tools**: [html2canvas (v1.4)](https://github.com/niklasvh/html2canvas), [jsPDF (v2.5)](https://github.com/parallax/jsPDF)
* **Icons**: FontAwesome 6

---

## 📈 Key Metrics & Calculations

### Innovation Score
To rank applicants objectively, the platform implements a standardized multi-criteria index:
$$\text{Innovation Score} = (0.5 \times \text{Patent Count}) + (0.3 \times \text{Average Citations}) + (0.2 \times \text{Domain Diversity})$$
* **Patent Count**: Volumetric measure of research capability.
* **Average Citations**: Direct quality impact indicator.
* **Domain Diversity**: Unique count of technology domains (1 to 10), reflecting cross-sector adaptability.

---

## ⚙️ How to Run Locally

### Option 1: Double-Click (Local File System)
Simply double-click `index.html`. The dashboard will detect the local environment and launch the in-memory fallback dataset generator seamlessly.

### Option 2: Live HTTP Server (Bypasses Browser CORS limits)
To load the pre-generated static `data/patents.json` dataset:
1. Run a local python server in the folder:
   ```bash
   python -m http.server 8000
   ```
2. Navigate to:
   ```text
   http://localhost:8000
   ```

---

## 🔮 Future Improvements

1. **Active NLP Patent Parsing**: Integrate client-side tokenizers to pull TF-IDF keywords from patent descriptions dynamically.
2. **Co-citation Networks**: Introduce interactive D3.js force-directed nodes showing citation linkages.
3. **Machine Learning Predictor**: Forecast filing trajectories for the upcoming 5 years.
