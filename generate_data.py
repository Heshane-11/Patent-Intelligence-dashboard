import json
import random
import os

def generate_patent_dataset():
    # Setup domains, countries, applicants, IPCs, etc.
    countries = ["United States", "China", "India", "Germany", "Japan", "South Korea", "United Kingdom", "France", "Canada", "Singapore"]
    
    applicants = ["Google", "Microsoft", "IBM", "Samsung", "Huawei", "NVIDIA", "OpenAI", "Tencent", "Amazon", "Meta"]
    
    domains = [
        "Generative AI", "Natural Language Processing", "Computer Vision", 
        "Robotics", "Healthcare AI", "Autonomous Systems", 
        "Cybersecurity AI", "Industrial Automation", "Recommendation Systems", "FinTech AI"
    ]
    
    ipc_map = {
        "Generative AI": "G06N",
        "Natural Language Processing": "G06F",
        "Computer Vision": "G06K", # Wait, prompt requested: G06N, G06F, G06Q, H04L, H04W, A61B, B25J, G01S. Let's map exactly to these.
        "Robotics": "B25J",
        "Healthcare AI": "A61B",
        "Autonomous Systems": "G01S",
        "Cybersecurity AI": "H04L",
        "Industrial Automation": "G06F",
        "Recommendation Systems": "G06Q",
        "FinTech AI": "G06Q"
    }
    # Backup mappings to ensure all requested IPCs are used properly
    domain_to_ipc = {
        "Generative AI": "G06N",
        "Natural Language Processing": "G06F",
        "Computer Vision": "G06F", # map CV to G06F
        "Robotics": "B25J",
        "Healthcare AI": "A61B",
        "Autonomous Systems": "G01S",
        "Cybersecurity AI": "H04L",
        "Industrial Automation": "G06F",
        "Recommendation Systems": "G06Q",
        "FinTech AI": "G06Q"
    }
    # Let's ensure H04W is also used (e.g. some Cybersecurity/Autonomous/NLP could use H04W for wireless)
    
    records = []
    
    # We want 2200 records
    total_records = 2250
    
    # Yearly weights: let's generate from 2015 to 2025
    years = list(range(2015, 2026))
    
    # Country distribution weights
    # China and US dominate
    country_weights = {
        "United States": 0.32,
        "China": 0.36,
        "India": 0.06,
        "Germany": 0.05,
        "Japan": 0.06,
        "South Korea": 0.07,
        "United Kingdom": 0.03,
        "France": 0.02,
        "Canada": 0.02,
        "Singapore": 0.01
    }
    
    # Let's prepare helper function to select items based on weights
    def weighted_choice(choices_dict):
        choices = list(choices_dict.keys())
        weights = list(choices_dict.values())
        return random.choices(choices, weights=weights, k=1)[0]
    
    for i in range(1, total_records + 1):
        patent_id = f"US{20250000 + i}" # We can change the prefix dynamically based on country, e.g., US, CN, IN, EP etc.
        
        # Determine country
        country = weighted_choice(country_weights)
        prefix = {
            "United States": "US",
            "China": "CN",
            "India": "IN",
            "Germany": "DE",
            "Japan": "JP",
            "South Korea": "KR",
            "United Kingdom": "GB",
            "France": "FR",
            "Canada": "CA",
            "Singapore": "SG"
        }[country]
        
        patent_id = f"{prefix}{20150000 + i}"
        
        # Decide year first because it controls technology domain and applicant distributions
        # Filings grow overall, but spike post 2020
        year_weights = {
            2015: 0.04, 2016: 0.04, 2017: 0.05, 2018: 0.06, 2019: 0.08,
            2020: 0.09, 2021: 0.11, 2022: 0.13, 2023: 0.14, 2024: 0.16, 2025: 0.10
        }
        filing_year = weighted_choice(year_weights)
        
        # Tech domain distribution based on year
        # Generative AI grows rapidly after 2020
        domain_weights = {}
        for d in domains:
            if d == "Generative AI":
                if filing_year <= 2018:
                    domain_weights[d] = 0.01
                elif filing_year <= 2020:
                    domain_weights[d] = 0.04
                elif filing_year <= 2022:
                    domain_weights[d] = 0.18
                else: # 2023-2025
                    domain_weights[d] = 0.32
            elif d == "Healthcare AI":
                if filing_year <= 2019:
                    domain_weights[d] = 0.05
                else:
                    domain_weights[d] = 0.12
            else:
                # default weight
                domain_weights[d] = 0.08
                
        # Normalize weights
        total_w = sum(domain_weights.values())
        domain_weights_normalized = {k: v/total_w for k, v in domain_weights.items()}
        tech_domain = weighted_choice(domain_weights_normalized)
        
        # Determine applicant
        # Google, Microsoft, Samsung, Huawei dominate total filings
        # IBM has fewer patents (e.g. 4% weight)
        # OpenAI has patents only post 2018, heavy post 2021
        applicant_weights = {
            "Google": 0.15,
            "Microsoft": 0.14,
            "Samsung": 0.13,
            "Huawei": 0.12,
            "Tencent": 0.10,
            "Amazon": 0.09,
            "Meta": 0.08,
            "IBM": 0.05, # Fewer patents for IBM
            "NVIDIA": 0.06,
            "OpenAI": 0.08 if filing_year >= 2020 else (0.01 if filing_year >= 2017 else 0.0)
        }
        # Normalize weights
        total_aw = sum(applicant_weights.values())
        applicant_weights_normalized = {k: v/total_aw for k, v in applicant_weights.items()}
        applicant = weighted_choice(applicant_weights_normalized)
        
        # Determine IPC Category
        ipc_category = domain_to_ipc[tech_domain]
        # Mix in H04W and other categories occasionally
        if tech_domain == "Autonomous Systems" and random.random() < 0.3:
            ipc_category = "H04W" # wireless connectivity for autonomous cars
        elif tech_domain == "Cybersecurity AI" and random.random() < 0.2:
            ipc_category = "H04W"
        
        # Determine Citation Count
        # IBM has high citation impact despite fewer patents.
        # OpenAI and NVIDIA also have high citation impact for GenAI.
        # Citation counts follow realistic distributions (power law / lognormal)
        if applicant == "IBM":
            # IBM high impact: mean 65, standard dev 30
            citation_count = int(random.lognormvariate(4.1, 0.4)) # mean around 65
        elif applicant in ["OpenAI", "NVIDIA"] and tech_domain == "Generative AI":
            # OpenAI/NVIDIA in GenAI: very high impact
            citation_count = int(random.lognormvariate(3.9, 0.5)) # mean around 55
        else:
            # General distribution: power law / lognormal (low mean, long tail)
            citation_count = int(random.lognormvariate(2.4, 0.8)) # mean around 15-20
            
        # Ensure citation count is non-negative and not excessively huge (cap at 350 for sanity)
        citation_count = min(max(0, citation_count), 350)
        
        # Determine status
        # Expired: older patents, e.g., 2015-2017
        # Pending: newer patents, e.g., 2023-2025
        # Granted: high share overall
        # Published: middle
        if filing_year >= 2024:
            status_choices = ["Pending", "Published", "Granted"]
            status_weights = [0.60, 0.30, 0.10]
        elif filing_year >= 2022:
            status_choices = ["Pending", "Published", "Granted"]
            status_weights = [0.20, 0.40, 0.40]
        elif filing_year <= 2017:
            status_choices = ["Granted", "Expired"]
            status_weights = [0.70, 0.30]
        else:
            status_choices = ["Granted", "Published", "Expired"]
            status_weights = [0.75, 0.20, 0.05]
            
        patent_status = random.choices(status_choices, weights=status_weights, k=1)[0]
        
        records.append({
            "patent_id": patent_id,
            "filing_year": filing_year,
            "country": country,
            "applicant": applicant,
            "technology_domain": tech_domain,
            "ipc_category": ipc_category,
            "citation_count": citation_count,
            "patent_status": patent_status
        })
        
    os.makedirs("data", exist_ok=True)
    with open("data/patents.json", "w") as f:
        json.dump(records, f, indent=2)
        
    print(f"Successfully generated {len(records)} patents in data/patents.json")

if __name__ == "__main__":
    generate_patent_dataset()
