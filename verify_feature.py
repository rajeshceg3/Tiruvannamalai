
from playwright.sync_api import sync_playwright
import time
from nanoid import generate

def generate_username():
    return f"seal_{generate(size=4)}"

def verify_dashboard_pagination():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Register/Login
            username = generate_username()
            password = "securepassword123"

            print(f"Navigating to auth page...")
            page.goto("http://localhost:5000/auth")

            # Click Register tab
            print("Clicking register tab...")
            page.get_by_role("tab", name="Register").click()

            # Fill form
            print(f"Registering user {username}...")
            form = page.locator('div[role="tabpanel"][data-state="active"] form')
            form.locator('input[name="username"]').fill(username)
            form.locator('input[name="password"]').fill(password)
            form.locator('button[type="submit"]').click()

            # Wait for dashboard
            print("Waiting for dashboard...")
            page.wait_for_url("**/dashboard", timeout=15000)

            # Verify elements
            print("Verifying dashboard elements...")
            page.get_by_role("heading", name="Dashboard").wait_for()
            page.get_by_text(f"Namaste, {username}").wait_for()

            # Verify Journal section exists
            page.get_by_role("heading", name="Your Journal").wait_for()

            # Take screenshot
            print("Taking screenshot...")
            screenshot_path = "verification/dashboard_verified.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error_state.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_dashboard_pagination()
