
from playwright.sync_api import sync_playwright, expect
import time
import sys

def run():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            print("--- Step 1: Login ---")
            page.goto("http://localhost:5000/auth")

            # Wait for either the auth title or the dashboard title
            # We give it some time to load the initial JS bundle
            try:
                # Create locators
                auth_title = page.get_by_text("Welcome to Sacred Steps")
                dashboard_title = page.get_by_text("Shrines on the Path")

                # Wait for one of them to appear
                print("Waiting for application to load...")
                expect(auth_title.or_(dashboard_title)).to_be_visible(timeout=10000)

                if auth_title.is_visible():
                    print("On Auth Page, registering new user...")

                    # Switch to register tab
                    page.get_by_role("tab", name="Register").click()

                    # Fill form
                    username = f"verifier_{int(time.time())}"
                    page.get_by_label("Username").fill(username)
                    page.get_by_label("Password").fill("password123")

                    page.get_by_role("button", name="Register").click()

                    # Wait for navigation to dashboard
                    print("Register clicked, waiting for navigation...")
                    page.wait_for_url("**/dashboard", timeout=15000)
                    print("Successfully navigated to Dashboard")

                else:
                    print("Already on Dashboard")

            except Exception as e:
                print(f"Failed during login/initial load: {e}")
                page.screenshot(path="verification/error_login.png")
                raise e

            # Verify we are on dashboard
            expect(page.get_by_text("Shrines on the Path")).to_be_visible(timeout=10000)
            page.screenshot(path="verification/0_dashboard_initial.png")

            print("--- Step 2: Verify Skeleton ---")

            # Intercept /api/shrines to simulate delay
            def handle_route(route):
                print("Network: Intercepted /api/shrines - delaying response...")
                time.sleep(3) # Delay 3 seconds
                try:
                    route.continue_()
                    print("Network: Continued request")
                except Exception as e:
                     # Request might have been aborted if page reloaded again or closed
                     pass

            page.route("**/api/shrines", handle_route)

            print("Reloading page...")
            page.reload()

            # Take screenshot immediately to catch skeleton
            time.sleep(1) # Wait a second for React to mount the skeleton

            if "/dashboard" not in page.url:
                print(f"Error: Reload caused redirect to {page.url}")
                page.screenshot(path="verification/error_reload_redirect.png")

            page.screenshot(path="verification/1_skeleton.png")
            print("Captured Skeleton state")

            # Wait for actual content to load after the delay
            print("Waiting for content to load...")
            expect(page.get_by_text("Shrines on the Path")).to_be_visible(timeout=15000)
            page.screenshot(path="verification/2_dashboard_loaded.png")
            print("Captured Dashboard loaded state")

            print("--- Step 3: Verify Offline Indicator ---")
            context.set_offline(True)
            expect(page.get_by_text("You are currently offline")).to_be_visible(timeout=5000)
            page.screenshot(path="verification/3_offline.png")
            print("Captured Offline State")

            browser.close()
            print("SUCCESS: UX Verification Complete")

    except Exception as e:
        print(f"FAILURE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run()
