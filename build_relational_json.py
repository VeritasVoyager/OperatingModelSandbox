import gspread
from google.oauth2.service_account import Credentials
import pandas as pd
import os
import json

# --- CONFIGURATION ---
GOOGLE_SHEET_NAME = "Operating Model Sandbox - Master Data"
DATA_TABS = ["archetypes", "archetype_tags", "strengths_weaknesses", "KPIs", "governance_points", "industry_nuances", "functional_decomposition"]
REPORT_TABS = ["Transformation_Playbook", "AI_Impact_Report"]
OUTPUT_DIR = "data"

def get_gspread_client():
    """Authenticates with Google Sheets API."""
    try:
        scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
        creds = Credentials.from_service_account_file("credentials.json", scopes=scopes)
        client = gspread.authorize(creds)
        print("Successfully authenticated with Google Sheets API.")
        return client
    except Exception as e:
        print(f"ERROR during authentication: {e}")
        return None

def read_all_tabs(client, sheet_name, tabs_to_read):
    """Reads all specified tabs from a Google Sheet into pandas DataFrames."""
    dataframes = {}
    try:
        sheet = client.open(sheet_name)
        for tab_name in tabs_to_read:
            try:
                worksheet = sheet.worksheet(tab_name)
                data = worksheet.get_all_records()
                df = pd.DataFrame(data)
                if 'archetype_id' in df.columns:
                    df['archetype_id'] = pd.to_numeric(df['archetype_id'], errors='coerce')
                    df.dropna(subset=['archetype_id'], inplace=True)
                    df['archetype_id'] = df['archetype_id'].astype(int)
                dataframes[tab_name] = df
                print(f"Successfully read tab: {tab_name}")
            except gspread.exceptions.WorksheetNotFound:
                print(f"WARNING: Tab '{tab_name}' not found. Skipping.")
                dataframes[tab_name] = pd.DataFrame()
        return dataframes
    except Exception as e:
        print(f"ERROR opening or reading spreadsheet: {e}")
        return None

def assemble_archetype_json(archetype_row, all_data):
    """Assembles a single detailed JSON object for one archetype."""
    archetype_id = archetype_row.get('archetype_id')
    if not isinstance(archetype_id, int): return None

    def filter_df(df_name, key='archetype_id', value=archetype_id):
        df = all_data.get(df_name)
        if df is None or df.empty:
            return pd.DataFrame()
        return df[df[key] == value]

    tags = filter_df('archetype_tags').to_dict('records')
    sw_df = filter_df('strengths_weaknesses')
    strengths = sw_df[sw_df['type'] == 'Strength']['point'].tolist()
    weaknesses = sw_df[sw_df['type'] == 'Weakness']['point'].tolist()
    kpis = filter_df('KPIs').to_dict('records')
    governance = filter_df('governance_points').to_dict('records')
    nuances = filter_df('industry_nuances').to_dict('records')

    # --- THIS IS THE CORRECTED LOGIC ---
    decomp_df = filter_df('functional_decomposition')
    functional_view_data = {}
    financial_view_data = {}
    if not decomp_df.empty:
        # Group once by 'functional_group' for the Functional View
        functional_view_data = {
            group: data[['body_of_work']].to_dict('records')
            for group, data in decomp_df.groupby('functional_group')
        }
        # Group a second time by 'financial_group' for the Financial View
        financial_view_data = {
            group: data[['body_of_work']].to_dict('records')
            for group, data in decomp_df.groupby('financial_group')
        }

    ai_impact_df = all_data.get('AI_Impact_Report', pd.DataFrame())
    universal_impacts = ai_impact_df[ai_impact_df['archetype_id'] == 0].to_dict('records')
    specific_impacts = ai_impact_df[ai_impact_df['archetype_id'] == archetype_id].to_dict('records')
    ai_impact_points = universal_impacts + specific_impacts

    final_json = {
        "model_name": archetype_row.get('name', ''),
        "tagline": archetype_row.get('tagline', ''),
        "description_short": archetype_row.get('description_short', ''),
        "description_long": archetype_row.get('description_long', ''),
        "file_slug": archetype_row.get('file_slug', ''),
        "tags": tags,
        "strengths_weaknesses": {"strengths": strengths, "weaknesses": weaknesses},
        "kpis": kpis,
        "governance_leadership": governance,
        "industry_nuances": nuances,
        "functional_view_data": functional_view_data,
        "financial_view_data": financial_view_data,
        "ai_impact_points": ai_impact_points
    }
    return final_json

def write_json_file(data, output_dir, filename):
    """Writes data to a JSON file with UTF-8 encoding."""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Successfully wrote file: {filepath}")

def main():
    """Main execution function."""
    print("--- Starting Data Build Script ---")
    client = get_gspread_client()
    if not client: return

    all_dataframes = read_all_tabs(client, GOOGLE_SHEET_NAME, DATA_TABS + REPORT_TABS)
    if not all_dataframes or 'archetypes' not in all_dataframes:
        print("Could not read 'archetypes' tab. Exiting.")
        return

    archetypes_df = all_dataframes.get('archetypes')

    homepage_archetypes_data = archetypes_df[['file_slug', 'name', 'tagline', 'best_for', 'size', 'industries']].to_dict(orient='records')
    write_json_file(homepage_archetypes_data, OUTPUT_DIR, "archetypes.json")

    for index, row in archetypes_df.iterrows():
        archetype_json = assemble_archetype_json(row, all_dataframes)
        if archetype_json:
            file_slug = row.get('file_slug', '').strip()
            if not file_slug:
                print(f"WARNING: Missing 'file_slug' for model '{row.get('name')}'. Skipping.")
                continue
            filename = f"{file_slug}.json"
            write_json_file(archetype_json, OUTPUT_DIR, filename)

    for report_name in REPORT_TABS:
        report_df = all_dataframes.get(report_name)
        if report_df is not None and not report_df.empty:
            report_json = report_df.to_dict('records')
            filename = f"{report_name.lower()}.json"
            write_json_file(report_json, OUTPUT_DIR, filename)

    print("--- Script Finished Successfully ---")

if __name__ == "__main__":
    main()