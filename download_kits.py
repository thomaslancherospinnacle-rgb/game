#!/usr/bin/env python3
"""
SoFIFA Kit Downloader with Selenium
Downloads team kit images (home, away, goalkeeper) and updates teams.json
"""

import json
import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# Configuration
TEAMS_JSON = 'teams.json'
OUTPUT_DIR = 'kits'
BASE_URL = 'https://sofifa.com'

def create_output_dir():
    """Create output directory if it doesn't exist"""
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"✓ Created directory: {OUTPUT_DIR}/")

def load_teams():
    """Load teams from JSON file"""
    try:
        with open(TEAMS_JSON, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {TEAMS_JSON} not found!")
        return None
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in {TEAMS_JSON}")
        return None

def save_teams(teams):
    """Save updated teams to JSON file"""
    with open(TEAMS_JSON, 'w', encoding='utf-8') as f:
        json.dump(teams, f, indent=2, ensure_ascii=False)
    print(f"✓ Updated {TEAMS_JSON}")

def setup_driver():
    """Setup Chrome driver with options"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Run in background
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--disable-logging')
    chrome_options.add_argument('--log-level=3')
    chrome_options.add_argument('--silent')
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        return driver
    except Exception as e:
        print(f"❌ Error setting up Chrome driver: {e}")
        print("   Make sure you have Chrome and chromedriver installed")
        return None

def search_and_get_team_page(driver, team_name):
    """Search for team and navigate to first result"""
    try:
        # Go to SoFIFA teams page
        driver.get(f'{BASE_URL}/teams')
        time.sleep(2)
        
        # Find search box and search for team
        try:
            search_box = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.NAME, 'keyword'))
            )
        except TimeoutException:
            print(f"   ⚠ Could not find search box")
            return None
        
        search_box.clear()
        search_box.send_keys(team_name)
        search_box.send_keys(Keys.RETURN)
        
        time.sleep(3)  # Wait for results
        
        # Find first team link in results table
        # Team links are in the format: <a href="/team/{id}/{name}/">
        try:
            first_team_link = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'table tbody tr td a[href*="/team/"]'))
            )
        except TimeoutException:
            print(f"   ⚠ No results found")
            return None
        
        team_url = first_team_link.get_attribute('href')
        print(f"   🎯 Clicking: {team_url}")
        
        # Click on the team link
        first_team_link.click()
        time.sleep(3)  # Wait for page to load
        
        return driver.current_url
        
    except Exception as e:
        print(f"   ⚠ Search error: {e}")
        return None

def extract_kit_images_selenium(driver):
    """Extract kit image URLs from current team page using Selenium"""
    try:
        kits = {
            'home': None,
            'away': None,
            'keeper': None
        }
        
        # Wait for kit section to load
        time.sleep(2)
        
        # Find all kit images
        # Look for figure elements with avatar class containing kit images
        kit_elements = driver.find_elements(By.CSS_SELECTOR, 'figure.avatar img')
        
        for img in kit_elements:
            alt_text = img.get_attribute('alt')
            src = img.get_attribute('data-src') or img.get_attribute('src')
            
            if not src or 'sofifa.net/empty.png' in src:
                continue
            
            if alt_text and 'Home kit' in alt_text:
                kits['home'] = src
            elif alt_text and 'Away kit' in alt_text:
                kits['away'] = src
            elif alt_text and 'Goalkeeper kit' in alt_text:
                kits['keeper'] = src
            elif alt_text and 'Third kit' in alt_text and not kits['keeper']:
                kits['keeper'] = src
        
        # If no kits found, try alternative method
        if not any(kits.values()):
            # Look in the "Kits" section
            page_source = driver.page_source
            import re
            
            # Find kit images in HTML
            home_match = re.search(r'alt="Home kit"[^>]*(?:data-src|src)="([^"]+)"', page_source)
            if home_match:
                kits['home'] = home_match.group(1)
            
            away_match = re.search(r'alt="Away kit"[^>]*(?:data-src|src)="([^"]+)"', page_source)
            if away_match:
                kits['away'] = away_match.group(1)
            
            keeper_match = re.search(r'alt="(?:Goalkeeper kit|Third kit)"[^>]*(?:data-src|src)="([^"]+)"', page_source)
            if keeper_match:
                kits['keeper'] = keeper_match.group(1)
        
        return kits
        
    except Exception as e:
        print(f"   ⚠ Extraction error: {e}")
        return None

def download_image(url, filepath):
    """Download image from URL to filepath"""
    try:
        # Handle URLs that might be relative
        if url.startswith('//'):
            url = 'https:' + url
        elif url.startswith('/'):
            url = BASE_URL + url
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://sofifa.com/'
        }
        
        response = requests.get(url, headers=headers, timeout=15, stream=True)
        
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        else:
            print(f"   ⚠ HTTP {response.status_code} for {url}")
            return False
            
    except Exception as e:
        print(f"   ⚠ Download error: {e}")
        return False

def process_team(driver, team, index, total):
    """Process a single team: search, download kits, update JSON"""
    team_id = team.get('team_id')
    team_name = team.get('team_name', 'Unknown')
    
    print(f"\n[{index}/{total}] Processing: {team_name} (ID: {team_id})")
    
    # Search for team and navigate to page
    print(f"   🔍 Searching SoFIFA...")
    team_url = search_and_get_team_page(driver, team_name)
    
    if not team_url:
        print(f"   ❌ Team not found on SoFIFA")
        return False
    
    print(f"   ✓ Found: {team_url}")
    
    # Extract kit images
    print(f"   📥 Extracting kit images...")
    
    kits = extract_kit_images_selenium(driver)
    
    if not kits or not any(kits.values()):
        print(f"   ❌ No kit images found")
        return False
    
    # Download kits
    success_count = 0
    
    kit_mapping = {
        'home': 'first',
        'away': 'second',
        'keeper': 'keeper'
    }
    
    for kit_type, kit_suffix in kit_mapping.items():
        if kits.get(kit_type):
            filename = f"{team_id}_{kit_suffix}.png"
            filepath = os.path.join(OUTPUT_DIR, filename)
            
            print(f"   ⬇ Downloading {kit_type} kit...")
            
            if download_image(kits[kit_type], filepath):
                # Update team JSON
                json_key = f"{kit_suffix}kit"
                team[json_key] = f"kits/{filename}"
                print(f"   ✓ Saved: {filename}")
                success_count += 1
            else:
                print(f"   ❌ Failed to download {kit_type} kit")
        else:
            print(f"   ⚠ {kit_type.capitalize()} kit not available")
    
    return success_count > 0

def main():
    """Main function"""
    print("=" * 60)
    print("SoFIFA Kit Downloader (Selenium)")
    print("=" * 60)
    
    # Setup
    create_output_dir()
    
    # Load teams
    print("\n📂 Loading teams.json...")
    teams = load_teams()
    
    if not teams:
        return
    
    print(f"✓ Loaded {len(teams)} teams")
    
    # Setup Selenium driver
    print("\n🌐 Setting up browser...")
    driver = setup_driver()
    
    if not driver:
        return
    
    print("✓ Browser ready")
    
    # Ask for confirmation
    print(f"\nThis will download kits for {len(teams)} teams.")
    print(f"Estimated time: ~{len(teams) * 8} seconds")
    print("Note: This will open an automated browser session")
    
    confirm = input("\nProceed? (y/n): ").strip().lower()
    
    if confirm != 'y':
        print("❌ Cancelled")
        driver.quit()
        return
    
    # Process each team
    success = 0
    failed = 0
    
    try:
        for index, team in enumerate(teams, 1):
            try:
                if process_team(driver, team, index, len(teams)):
                    success += 1
                else:
                    failed += 1
            except KeyboardInterrupt:
                print("\n\n⚠ Interrupted by user")
                break
            except Exception as e:
                print(f"   ❌ Unexpected error: {e}")
                failed += 1
    finally:
        # Clean up
        print("\n🔒 Closing browser...")
        driver.quit()
    
    # Save updated teams.json
    if success > 0:
        print("\n" + "=" * 60)
        save_teams(teams)
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✓ Success: {success}")
    print(f"❌ Failed: {failed}")
    print(f"📁 Kits saved to: {OUTPUT_DIR}/")
    print("=" * 60)

if __name__ == '__main__':
    main()
