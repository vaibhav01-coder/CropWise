from pathlib import Path
import json

def get_recommended_schemes(user_profile):
    # Load DB
    db_path = Path(__file__).parent / 'schemes_db.json'
    if not db_path.exists():
        return []
        
    with open(db_path, 'r') as f:
        db = json.load(f)
    
    recommendations = []
    farmer_state = user_profile.get('state', 'Central')
    farmer_category = user_profile.get('category', 'all_farmers') # e.g., 'small_farmer'

    for scheme in db:
        score = 0
        
        # 1. State Filter (Crucial)
        # If scheme is specific to a state, match strictly.
        if scheme['scope'] not in ["Central", "All"] and scheme['scope'] != farmer_state:
            continue 
            
        # 2. Scoring Logic
        if scheme['scope'] == farmer_state:
            score += 100 # Home state priority
        elif scheme['scope'] == "Central":
            score += 50
            
        if "all_farmers" in scheme['tags'] or farmer_category in scheme['tags']:
            score += 20
        else:
            # If scheme is only for small farmers but user is large, skip
            if "small_farmer" in scheme['tags'] and farmer_category == "large_farmer":
                continue

        recommendations.append({
            "scheme_name": scheme['name'],
            "description": scheme['description'],
            "match_score": score,
            "type": scheme['scope']
        })

    # Sort best matches first
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    return recommendations