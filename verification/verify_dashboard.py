import time
from playwright.sync_api import sync_playwright

def verify_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create context with storage state to simulate logged-in user if needed
        # Or register a new user
        context = browser.new_context()
        page = context.new_page()

        # 1. Register a user to get to dashboard
        page.goto("http://localhost:5000/auth")

        # Check if we are already on dashboard (if session persisted, unlikely in fresh start)
        if "dashboard" in page.url:
            print("Already on dashboard")
        else:
            # Fill registration form
            page.fill('input[name="username"]', "testuser_qa")
            page.fill('input[name="password"]', "password123")
            # Click register (assuming there are tabs, let's look for "Register" button inside the Register tab content)
            # We might need to switch to Register tab if Login is default
            # Let's assume the UI has Tabs.
            # Click "Register" tab trigger
            page.get_by_role("tab", name="Register").click()
            # Click the submit button inside the form
            page.get_by_role("button", name="Register").click()

            # Wait for navigation
            page.wait_for_url("**/dashboard")

        # 2. Verify Dashboard Elements
        # Check for Shrines list
        page.wait_for_selector("text=Shrines on the Path")

        # 3. Simulate Check-in (Virtual)
        # Find the first "Verify Presence" or similar button.
        # Actually the button says "Verify Presence" only if close.
        # Otherwise "Xm to Target".
        # But for testing, we might not have geolocation in headless easily without override.
        # Playwright can override geolocation.

        # Let's override geolocation to be near the first shrine (Indra Lingam: 12.2353, 79.0847)
        context.set_geolocation({"latitude": 12.2353, "longitude": 79.0847, "accuracy": 10})
        context.grant_permissions(["geolocation"])

        page.reload()

        # Wait for "Verify Presence" button
        # It might take a moment for the component to pick up the location
        # The button text changes to "Verify Presence"
        verify_btn = page.get_by_role("button", name="Verify Presence").first
        verify_btn.wait_for(state="visible", timeout=10000)
        verify_btn.click()

        # 4. Verify Optimistic UI / Journal Entry
        # After check-in, a journal entry should appear.
        # Check for text "Your Reflection"
        page.wait_for_selector("text=Your Reflection", timeout=10000)

        # 5. Take Screenshot
        page.screenshot(path="verification/dashboard_verified.png")
        print("Screenshot saved to verification/dashboard_verified.png")

        browser.close()

if __name__ == "__main__":
    verify_dashboard()
