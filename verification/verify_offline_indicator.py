from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    context.grant_permissions(['geolocation'])
    page = context.new_page()

    try:
        # 1. Register
        page.goto("http://localhost:5000/auth")
        page.get_by_role("tab", name="Register").click()

        import random
        import string
        username = 'testuser_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        password = 'password123'

        page.locator('input[name="username"]').fill(username)
        page.locator('input[name="password"]').fill(password)
        page.get_by_role("button", name="Register").click()

        page.wait_for_url("**/dashboard")

        # 2. Go to Group Command
        page.goto("http://localhost:5000/group-command")

        # 3. Handle Group Creation
        # Wait for either Create Squad button or Squadron Overwatch header
        # We poll for presence
        found = False
        for i in range(10):
            if page.get_by_role("button", name="Create Squad").is_visible():
                print("Found Create Squad button")
                page.get_by_role("button", name="Create Squad").click()
                page.get_by_placeholder("e.g. Alpha Team").fill("Test Squad")
                page.get_by_role("button", name="Initialize Squad").click()
                found = True
                break
            elif page.get_by_text("Squadron Overwatch").is_visible():
                print("Found Squadron Overwatch")
                found = True
                break
            time.sleep(1)

        if not found:
             print("Could not find Create Squad or Overwatch")
             page.screenshot(path="verification/debug_not_found.png")

        page.wait_for_selector("text=Squadron Overwatch", timeout=20000)

        # 4. Simulate Offline
        context.set_offline(True)

        # Wait for offline indicator
        page.wait_for_selector("text=You are currently offline", timeout=10000)

        # 5. Send SitRep (Queue it)
        page.get_by_placeholder("Message...").fill("This is an offline sitrep")
        page.locator("form button[type='submit']").click()

        # 6. Verify "1 pending upload"
        time.sleep(2)

        expect_text = "1 pending upload"
        if page.get_by_text(expect_text).is_visible():
            print("Verified pending upload text")
        else:
            print("Pending upload text NOT found")
            page.screenshot(path="verification/debug_text_missing.png")

        # 7. Screenshot
        page.screenshot(path="verification/verification.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
        raise e
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
