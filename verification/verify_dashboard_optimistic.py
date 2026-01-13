import time
from playwright.sync_api import sync_playwright

def verify_dashboard_optimistic():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Login
        page.goto("http://localhost:5000/auth")
        page.get_by_role("tab", name="Register").click()
        page.fill('input[name="username"]', "testuser_opt_2")
        page.fill('input[name="password"]', "password123")
        page.get_by_role("button", name="Register").click()
        page.wait_for_url("**/dashboard")

        # Scroll to bottom to ensure elements load
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

        # Look for "Check In" button.
        # In the screenshot, they are orange buttons in the cards.
        # The text "Check In" should be visible.
        # Wait for shrines to load
        page.wait_for_selector("text=Indra Lingam")

        # Click the FIRST Check In button
        # Note: If it's covered by something or not clickable, playwright will complain.
        btns = page.get_by_role("button", name="Check In")
        print(f"Found {btns.count()} Check In buttons.")

        if btns.count() > 0:
            # We want to catch the optimistic state.
            # Use request interception to DELAY the API response?
            # So we can see the "Syncing..." state.

            # Route /api/visits to delay
            def handle_route(route):
                time.sleep(2) # Delay 2 seconds
                route.continue_()

            page.route("**/api/visits", handle_route)

            btns.first.click()
            print("Clicked Check In.")

            # Immediately look for the Save button with "Syncing..." text
            # It should appear in the "Your Journal" section.

            try:
                # We look for the button that has text "Syncing..."
                # Or title "Syncing..."
                sync_btn = page.locator('button[title="Syncing..."]')
                sync_btn.wait_for(state="visible", timeout=1000)
                print("SUCCESS: Found 'Syncing...' button state.")
            except:
                print("Could not find Syncing button in time.")

            page.screenshot(path="verification/dashboard_optimistic_delay.png")

        browser.close()

if __name__ == "__main__":
    verify_dashboard_optimistic()
