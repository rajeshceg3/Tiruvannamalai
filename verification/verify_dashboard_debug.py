import time
from playwright.sync_api import sync_playwright

def verify_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("http://localhost:5000/auth")

        # Take a screenshot of the auth page
        page.screenshot(path="verification/auth_page.png")
        print("Auth page screenshot saved.")

        # Check for Register tab
        try:
            page.get_by_role("tab", name="Register").click()
            print("Clicked Register tab.")
        except Exception as e:
            print(f"Could not click Register tab: {e}")

        page.fill('input[name="username"]', "testuser_qa_2")
        page.fill('input[name="password"]', "password123")

        # Click submit
        try:
            page.get_by_role("button", name="Register").click()
            print("Clicked Register button.")
        except Exception as e:
            # Maybe the button name is different? "Sign Up"?
            # Fallback to finding button by type submit
            page.locator("button[type=submit]").click()
            print("Clicked submit button via selector.")

        # Wait for navigation or error
        try:
            page.wait_for_url("**/dashboard", timeout=10000)
            print("Navigated to dashboard.")
        except Exception:
            print("Navigation failed. Taking error screenshot.")
            page.screenshot(path="verification/error_state.png")
            # Log body text to see if there is an error message
            print(page.inner_text("body"))

        browser.close()

if __name__ == "__main__":
    verify_dashboard()
