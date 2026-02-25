from playwright.sync_api import sync_playwright
import time
import random
import string

def generate_random_string(length=8):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def verify_enrichment():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Verify Home Page Content
            print("Verifying Home Page...")
            page.goto("http://localhost:5000/")
            page.wait_for_load_state("networkidle")

            # Check Hero text
            page.get_by_text("Walk the Path of Fire").wait_for()
            page.get_by_text("Awaken the Silence").wait_for()

            # Check Features
            page.get_by_text("Unlock the secrets of the 8 Ashta Lingams").wait_for()

            # Check Testimonials
            page.get_by_text("I've walked Girivalam ten times").wait_for()

            page.screenshot(path="verification/home_enrichment.png", full_page=True)
            print("Home Page verified.")

            # 2. Register/Login to access Dashboard
            username = f"pilgrim_{generate_random_string(4)}"
            password = "securepassword123"

            print(f"Registering user {username}...")
            page.goto("http://localhost:5000/auth")
            page.get_by_role("tab", name="Register").click()

            # Use specific locator for the active form
            form = page.locator('div[role="tabpanel"][data-state="active"] form')
            form.locator('input[name="username"]').fill(username)
            form.locator('input[name="password"]').fill(password)
            form.locator('button[type="submit"]').click()

            page.wait_for_url("**/dashboard", timeout=15000)

            # 3. Verify Dashboard Content
            print("Verifying Dashboard...")
            page.get_by_text("The Sacred Scroll").wait_for()
            page.get_by_text("At each Lingam, the veil between worlds is thin").wait_for()

            # Check for Daily Quote (random, so just check existence of container or common text)
            page.get_by_text("Daily Wisdom").wait_for()

            page.screenshot(path="verification/dashboard_enrichment.png", full_page=True)
            print("Dashboard verified.")

            # 4. Verify Pathfinder Content
            print("Verifying Pathfinder...")
            page.goto("http://localhost:5000/pathfinder")
            page.wait_for_load_state("networkidle")

            # Check Intro text
            page.get_by_text("Your digital compass for the sacred circuit").wait_for()

            # Check Safety Tips (random, so check container title)
            page.get_by_text("Pilgrim's Guide").wait_for()
            page.get_by_text("Tip of the Day").wait_for()

            page.screenshot(path="verification/pathfinder_enrichment.png", full_page=True)
            print("Pathfinder verified.")

            # 5. Verify Mission Debrief Content
            print("Verifying Mission Debrief...")
            page.goto("http://localhost:5000/debrief")
            page.wait_for_load_state("networkidle")

            # Check completion message logic (0 progress)
            page.get_by_text("The journey of a thousand lifetimes begins").wait_for()

            page.screenshot(path="verification/mission_debrief_enrichment.png", full_page=True)
            print("Mission Debrief verified.")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error_state.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_enrichment()
