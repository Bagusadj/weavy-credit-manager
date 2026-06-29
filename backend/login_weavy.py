#!/usr/bin/env python3
"""Weavy Google OAuth Login via Selenium Stealth"""
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium_stealth import stealth
import json
import sys
import os
import random
import time

def login_weavy(email: str, password: str, timeout: int = 120):
    """Login to Weavy via Google OAuth with stealth, return session cookies."""
    driver = None
    try:
        # Stealth Chrome options
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-setuid-sandbox")
        options.binary_location = "/snap/bin/chromium"
        
        # Random user agent
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        ]
        options.add_argument(f"--user-agent={random.choice(user_agents)}")
        
        driver = webdriver.Chrome(options=options)
        
        # Apply selenium-stealth
        stealth(driver,
            languages=["en-US", "en"],
            vendor="Google Inc.",
            platform="Win32",
            webgl_vendor="Intel Inc.",
            renderer="Intel Iris OpenGL Engine",
            fix_hairline=True,
        )
        
        # Navigate to Weavy
        print(f"[*] Navigating to app.weavy.ai...")
        driver.get("https://app.weavy.ai/")
        time.sleep(random.uniform(2, 4))
        
        # Click "Log in with Google"
        print("[*] Clicking 'Log in with Google'...")
        WebDriverWait(driver, 30).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Log in with Google')]"))
        ).click()
        time.sleep(random.uniform(3, 5))
        
        # Wait for Google login page
        print("[*] Waiting for Google login page...")
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="email"]'))
        )
        
        # Fill email - type slowly
        print(f"[*] Entering email: {email}")
        email_input = driver.find_element(By.CSS_SELECTOR, 'input[type="email"]')
        for char in email:
            email_input.send_keys(char)
            time.sleep(random.uniform(0.05, 0.15))
        time.sleep(random.uniform(1, 2))
        
        # Click Next
        next_btn = driver.find_element(By.ID, "identifierNext")
        next_btn.click()
        time.sleep(random.uniform(2, 4))
        
        # Wait for password field
        print("[*] Waiting for password field...")
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="password"]'))
        )
        
        # Fill password - type slowly
        print("[*] Entering password...")
        password_input = driver.find_element(By.CSS_SELECTOR, 'input[type="password"]')
        for char in password:
            password_input.send_keys(char)
            time.sleep(random.uniform(0.05, 0.15))
        time.sleep(random.uniform(1, 2))
        
        # Click Sign in
        next_btn = driver.find_element(By.ID, "passwordNext")
        next_btn.click()
        time.sleep(random.uniform(3, 6))
        
        # Wait for redirect back to Weavy
        print("[*] Waiting for redirect to Weavy dashboard...")
        WebDriverWait(driver, 60).until(
            lambda d: "app.weavy.ai" in d.current_url and "signin" not in d.current_url
        )
        
        # Handle "Welcome" popup if exists
        try:
            WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'I understand')]"))
            ).click()
            print("[*] Clicked 'I understand' popup")
        except:
            print("[*] No welcome popup")
        
        # Get cookies
        cookies = driver.get_cookies()
        session_data = {cookie['name']: cookie['value'] for cookie in cookies}
        
        print("[*] Login successful!")
        driver.quit()
        
        return {
            "success": True,
            "cookies": session_data,
            "email": email
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"[!] Login failed: {error_msg}")
        if driver:
            try:
                driver.quit()
            except:
                pass
        return {
            "success": False,
            "error": error_msg
        }

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "Usage: login.py <email> <password>"}))
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    result = login_weavy(email, password)
    print(json.dumps(result))
    
    if not result["success"]:
        sys.exit(1)