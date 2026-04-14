import requests
import json
import time

# Region 110 = Contiguous US
START_YEAR = 1926
END_YEAR = 2026
END_MONTH = 3
OUT_FILE = "us_conus_climate_1926_2026.json"

VARIABLES = ["tavg", "pcp"]

def fetch_noaa_data(var_name, date_str, retries=3):
    url = f"https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/county/mapping/110/{var_name}/{date_str}/1.json"
    
    for attempt in range(retries):
        try:
            # Increased timeout to 30 seconds
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                return response.json().get('data', {})
            elif response.status_code == 404:
                return None # Month doesn't exist yet
        except (requests.exceptions.RequestException, requests.exceptions.Timeout):
            if attempt < retries - 1:
                print(f"\n[Timeout] Retrying {var_name} for {date_str} (Attempt {attempt + 2}/{retries})...")
                time.sleep(10) # Wait 2 seconds before retrying
            else:
                print(f"\n[Failed] Final timeout for {var_name} at {date_str}")
    return None

results = {}

print(f"Starting Robust Download: 1926-2026 (Region 110)")

for year in range(START_YEAR, END_YEAR + 1):
    for month in range(1, 13):
        if year == END_YEAR and month > END_MONTH:
            break
            
        date_key = f"{year}{str(month).zfill(2)}"
        print(f"Syncing: {date_key}...", end="\r")
        
        month_data = {}
        for var in VARIABLES:
            data = fetch_noaa_data(var, date_key)
            if data:
                for fips, val_obj in data.items():
                    if fips not in month_data: month_data[fips] = {}
                    try:
                        month_data[fips][var] = float(val_obj['value'])
                    except:
                        month_data[fips][var] = None
        
        for fips, vars_obj in month_data.items():
            if fips not in results:
                results[fips] = {}
            
            # Keeping keys as temp/precip to match your existing SPEI.html
            results[fips][date_key] = {
                "temp": vars_obj.get("tavg"),
                "precip": vars_obj.get("pcp"),
            }
        
        time.sleep(0.1)

with open(OUT_FILE, 'w') as f:
    json.dump(results, f)

print(f"\n\nSuccess! Created: {OUT_FILE}")