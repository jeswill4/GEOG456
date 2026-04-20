import json

INPUT_FILE = "us_conus_climate_1926_2026.json"
OUTPUT_FILE = "slim_climate_data.json"

print("Loading massive JSON...")
with open(INPUT_FILE, 'r') as f:
    data = json.load(f)

slim_data = {}

print("Compacting...")
for fips, dates in data.items():
    slim_data[fips] = {}
    for date_key, values in dates.items():
        # Rounding and using index-based storage [temp, precip, pdsi]
        t = round(values.get('temp', 0), 1) if values.get('temp') is not None else 0
        p = round(values.get('precip', 0), 2) if values.get('precip') is not None else 0
        pdsi = round(values.get('pdsi', 0), 2) if values.get('pdsi') is not None else 0
        
        slim_data[fips][date_key] = [t, p, pdsi]

print(f"Saving slim file to {OUTPUT_FILE}...")
# FIX: The separators argument goes here, in json.dump
with open(OUTPUT_FILE, 'w') as f:
    json.dump(slim_data, f, separators=(',', ':'))

print("Done! Check the new file size.")