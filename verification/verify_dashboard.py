from playwright.sync_api import sync_playwright, expect
import time

def verify_dashboard(page):
    print("Navigating to auth...")
    page.goto("http://localhost:5000/auth")

    # Login/Register
    print("Registering new user...")
    page.get_by_role("tab", name="Register").click()
    page.locator("div[role='tabpanel'][data-state='active'] form input[name='username']").fill("verifier_01")
    page.locator("div[role='tabpanel'][data-state='active'] form input[name='password']").fill("password123")
    page.locator("div[role='tabpanel'][data-state='active'] form button[type='submit']").click()

    print("Waiting for dashboard...")
    page.wait_for_url("**/dashboard")
    expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()

    print("Taking screenshot...")
    page.screenshot(path="verification/dashboard.png")
    print("Screenshot saved to verification/dashboard.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_dashboard(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
