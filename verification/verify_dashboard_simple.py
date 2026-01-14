import time
from playwright.sync_api import sync_playwright

def verify_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a simpler location (Indra Lingam)
        context = browser.new_context(
            geolocation={"latitude": 12.2353, "longitude": 79.0847, "accuracy": 10},
            permissions=["geolocation"]
        )
        page = context.new_page()

        # Login/Register
        page.goto("http://localhost:5000/auth")
        page.get_by_role("tab", name="Register").click()
        page.fill('input[name="username"]', "testuser_qa_4")
        page.fill('input[name="password"]', "password123")
        page.get_by_role("button", name="Register").click()
        page.wait_for_url("**/dashboard")

        # Scroll down to ensure images are loaded (lazy loading)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)

        # Check for images with alt text
        # Indra Lingam
        expect_alt = "View of Indra Lingam"

        # We might need to look inside the ShrineList or VisitCard.
        # Initially there are no visits, so VisitCards are empty.
        # But there is a "Shrines on the Path" list.
        # Let's check if the ShrineList displays images or just text.
        # Dashboard page says: <ShrineList ... />
        # I need to know if ShrineList renders images.

        # Taking a screenshot to inspect
        page.screenshot(path="verification/dashboard_view.png")
        print("Screenshot saved to verification/dashboard_view.png")

        browser.close()

if __name__ == "__main__":
    verify_dashboard()
