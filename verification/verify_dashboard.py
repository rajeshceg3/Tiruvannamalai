from playwright.sync_api import sync_playwright, expect
import os

def run():
    print("Starting Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # 1. Register
            print("Navigating to auth page...")
            page.goto("http://localhost:5000/auth")

            # Click "Register" tab
            print("Switching to Register tab...")
            page.get_by_role("tab", name="Register").click()
            page.wait_for_timeout(500)

            print("Filling registration form...")

            # Check inputs
            # Username
            username_locator = page.get_by_role("textbox", name="Username")
            count = username_locator.count()
            print(f"Found {count} username inputs.")

            if count == 0:
                # Maybe using 'label' locator?
                print("Trying by label...")
                page.get_by_label("Username").last.fill("JulesVerified")
            else:
                # Use the last one (assuming Register is second tab or active one replaces previous)
                # If Radix unmounts, count might be 1. If it hides, count is 2.
                # If it hides, the first one is hidden.
                # Let's use filter by visibility.
                username_locator.locator("visible=true").fill("JulesVerified")

            # Password
            # Password inputs don't have role=textbox
            pw_locator = page.locator("input[name='password']")
            pw_locator.locator("visible=true").fill("password123")

            print("Submitting registration...")
            # Button might be duplicated too ("Login", "Register")
            # We want the visible one or named "Register"
            page.get_by_role("button", name="Register").click()

            # Wait for navigation to dashboard
            print("Waiting for dashboard...")
            page.wait_for_url("**/dashboard")

            # 2. Verify Dashboard
            print("Verifying dashboard content...")
            # Check for "Your journal is empty" or similar.
            expect(page.get_by_text("Your journal is empty")).to_be_visible()

            # 3. Screenshot
            print("Taking screenshot...")
            os.makedirs("/home/jules/verification", exist_ok=True)
            screenshot_path = "/home/jules/verification/dashboard.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
