import time
from playwright.sync_api import sync_playwright

def verify_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Setup geolocation in context
        context = browser.new_context(
            geolocation={"latitude": 12.2353, "longitude": 79.0847, "accuracy": 10},
            permissions=["geolocation"]
        )
        page = context.new_page()

        # Login/Register
        page.goto("http://localhost:5000/auth")
        page.get_by_role("tab", name="Register").click()
        page.fill('input[name="username"]', "testuser_qa_3")
        page.fill('input[name="password"]', "password123")
        page.get_by_role("button", name="Register").click()
        page.wait_for_url("**/dashboard")

        # Verify Dashboard
        page.wait_for_selector("text=Shrines on the Path")

        # Look for "Verify Presence" for Indra Lingam (first one)
        # It should correspond to our mocked location
        # We might need to wait for the compass to calculate distance
        print("Waiting for 'Verify Presence'...")

        # Sometimes the compass takes a moment to load and update distance
        # We look for the button. It might initially say "Xm to Target" then switch to "Verify Presence"
        verify_btn = page.get_by_role("button", name="Verify Presence").first
        verify_btn.wait_for(state="visible", timeout=15000)

        print("Clicking Verify Presence...")
        verify_btn.click()

        # Check for Journal Entry appearance (Optimistic UI)
        print("Waiting for journal entry...")
        page.wait_for_selector("text=Your Reflection", timeout=10000)

        # Check if the "Save" button exists and check its state
        # We want to verify it handles the "Syncing..." state if we could catch it,
        # but locally it might be too fast.
        # However, we can at least verify the journal entry is there.

        # Verify the image alt text is present (Accessibility fix)
        # Indra Lingam image
        expect_alt = "View of Indra Lingam"
        img = page.get_by_alt_text(expect_alt).first
        if img.is_visible():
            print(f"Image with alt '{expect_alt}' is visible.")
        else:
            print(f"Image with alt '{expect_alt}' NOT found.")

        # Take screenshot
        page.screenshot(path="verification/dashboard_verified.png")
        print("Screenshot saved to verification/dashboard_verified.png")

        browser.close()

if __name__ == "__main__":
    verify_dashboard()
