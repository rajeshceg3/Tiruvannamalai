from playwright.sync_api import sync_playwright
import time
import random

def verify(page):
    print("Navigating to auth page...")
    page.goto("http://localhost:5000/auth")

    username = f"commander_{random.randint(1000, 9999)}"
    print(f"Registering user: {username}")

    # Click Register Tab
    try:
        page.get_by_role("tab", name="Register").click()
    except:
        pass

    # Target the register form specifically
    # Using the button text to identify the correct form
    register_form = page.locator('form').filter(has=page.get_by_role("button", name="Register"))

    # Wait for visibility?
    # register_form.wait_for(state="visible")

    register_form.get_by_label("Username").fill(username)
    register_form.get_by_label("Password").fill("password123")

    print("Clicking Register button...")
    register_form.get_by_role("button", name="Register").click()

    # Wait for navigation to /dashboard
    print("Waiting for dashboard...")
    page.wait_for_url("**/dashboard")

    # Navigate to Group Command
    print("Navigating to Group Command...")
    page.goto("http://localhost:5000/group-command")

    # Create Squad
    print("Creating Squad...")
    # Check if Create Squad button is visible
    try:
        # We might need to wait for the page to load first
        page.wait_for_load_state("networkidle")

        # Look for "Create Squad" button
        create_btn = page.get_by_role("button", name="Create Squad")
        if create_btn.is_visible():
            create_btn.click()
            page.get_by_placeholder("e.g. Alpha Team").fill(f"Tactical Unit {random.randint(100,999)}")
            page.get_by_role("button", name="Initialize Squad").click()

            # Wait for it to process
            page.wait_for_selector("text=Squadron Overwatch", timeout=10000)
    except Exception as e:
        print("Skipping creation (maybe already created or error):", e)

    # Verify Tactical Controls
    print("Looking for Tactical controls...")
    page.wait_for_selector("text=Tactical:")

    # Click "Rally"
    print("Clicking Rally...")
    page.get_by_role("button", name="Rally").click()

    # Verify "Click Map to Place" appears
    print("Verifying 'Click Map to Place'...")
    page.wait_for_selector("text=Click Map to Place")

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="/home/jules/verification/verification.png")
    print("Done.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
