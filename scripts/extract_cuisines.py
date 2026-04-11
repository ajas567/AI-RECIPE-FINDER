import pymongo
from database import get_client, DB_NAME
import json

def extract_unique_fields():
    client = get_client()
    db = client[DB_NAME]
    recipes_col = db['recipes']

    print("Querying MongoDB for unique cuisines and tastes. This might take a moment...")
    
    unique_cuisines = set()
    unique_tastes = set()
    
    # We use projection to only pull the fields we need across the entire collection
    cursor = recipes_col.find(
        {}, 
        {"cuisine_list": 1, "tastes": 1, "_id": 0}
    )
    
    for doc in cursor:
        cuisines = doc.get("cuisine_list")
        if cuisines and isinstance(cuisines, list):
            for c in cuisines:
                unique_cuisines.add(c.strip().title())
        elif cuisines and isinstance(cuisines, str):
            unique_cuisines.add(cuisines.strip().title())
            
        tastes = doc.get("tastes")
        # tastes might be a dict e.g. {"sweet": 0.5, "salty": 0.8} or a list
        if tastes and isinstance(tastes, dict):
            for t in tastes.keys():
                unique_tastes.add(t.strip().title())
        elif tastes and isinstance(tastes, list):
            for t in tastes:
                unique_tastes.add(t.strip().title())

    result = {
        "cuisines": sorted(list(unique_cuisines)),
        "tastes": sorted(list(unique_tastes))
    }
    
    print("\n--- EXTRACTION COMPLETE ---")
    print("\nUNIQUE CUISINES:")
    print(json.dumps(result["cuisines"], indent=2))
    
    print("\nUNIQUE TASTES:")
    print(json.dumps(result["tastes"], indent=2))
    
    with open("extracted_fields.json", "w") as f:
        json.dump(result, f, indent=4)
        print("\nSaved output to extracted_fields.json")

if __name__ == "__main__":
    extract_unique_fields()
