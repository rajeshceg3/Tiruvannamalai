from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Register/Login
            print("Navigating to auth page...")
            page.goto("http://localhost:5000/auth")

            # Click Register tab
            page.get_by_role("tab", name="Register").click()

            username = f"verif_user_{int(time.time())}"
            print(f"Registering as {username}...")

            form = page.locator('div[role="tabpanel"][data-state="active"] form')
            form.locator('input[name="username"]').fill(username)
            form.locator('input[name="password"]').fill("password123")
            form.locator('button[type="submit"]').click()

            # Wait for dashboard
            page.wait_for_url("**/dashboard")
            print("Logged in successfully.")

            # Wait for initial connection
            expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()
            # Give it a moment to stabilize
            page.wait_for_timeout(2000)

            # 2. Simulate Offline
            print("Simulating offline mode...")
            context.set_offline(True)

            # Wait for indicator to show "You are currently offline"
            expect(page.get_by_text("You are currently offline")).to_be_visible(timeout=10000)
            print("Offline indicator confirmed.")

            # 3. Restore Connection
            print("Restoring connection...")
            context.set_offline(False)

            # Expect Toast
            expect(page.get_by_text("Connection Restored", exact=True)).to_be_visible(timeout=20000)
            print("Toast 'Connection Restored' visible!")

            # Take screenshot
            page.screenshot(path="verification/toast_verified.png")
            print("Screenshot saved.")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
