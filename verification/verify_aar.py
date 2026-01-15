
import logging
from playwright.sync_api import sync_playwright, expect
import time
import sys
import re

def verify_aar_playback():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant geo permissions to avoid prompts
        context = browser.new_context(permissions=['geolocation'])
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

        try:
            # 1. Login (Create a new user)
            print("Navigating to home page...")
            page.goto("http://localhost:5000/")

            # Wait for any loading
            page.wait_for_timeout(2000)

            # Check if we need to login or register
            if page.get_by_role("button", name="Start Pilgrimage").is_visible():
                print("Clicking Start Pilgrimage...")
                page.get_by_role("button", name="Start Pilgrimage").click()

            # Wait for Auth Page to load
            print("Waiting for Auth Page...")
            expect(page.get_by_text("Welcome to Sacred Steps")).to_be_visible()

            # Switch to Register Tab
            print("Switching to Register tab...")
            page.get_by_role("tab", name="Register").click()

            page.wait_for_timeout(500) # Wait for animation

            # Fill registration form
            print("Registering new user...")
            timestamp = int(time.time())

            # Use specific selectors inside the register tab
            register_panel = page.get_by_role("tabpanel", name="Register")

            # Check visibility
            if not register_panel.is_visible():
                print("ERROR: Register panel not visible")
                page.screenshot(path="verification/error_panel_hidden.png")

            print("Filling form...")
            # Use 'nth(0)' if there are multiple, but inside tabpanel there should be one
            register_panel.get_by_label("Username").fill(f"verify_user_{timestamp}")
            register_panel.get_by_label("Password").fill("password123")

            print("Clicking Register button...")
            submit_btn = register_panel.get_by_role("button", name="Register")

            if not submit_btn.is_enabled():
                print("ERROR: Register button is disabled!")
                page.screenshot(path="verification/error_btn_disabled.png")

            submit_btn.click()

            # Wait for dashboard
            print("Waiting for dashboard...")
            # Increase timeout and check for URL change
            try:
                # Use regex for to_have_url
                expect(page).to_have_url(re.compile(r".*/dashboard"), timeout=10000)
            except Exception as e:
                print("URL did not change to dashboard.")
                page.screenshot(path="verification/error_no_redirect.png")
                # print page text to see if there is an error message
                print("Page content:", page.content())
                raise e

            print("Dashboard loaded.")

            # Wait for meaningful content to appear (skeletons to disappear)
            # "Shrines on the Path" is a good indicator that data has loaded
            expect(page.get_by_text("Shrines on the Path")).to_be_visible(timeout=10000)

            # 2. Create a Group (Squad) to get an ID
            print("Creating a Squad...")

            # Navigate to Group Command via Sidebar or Mobile Menu
            if page.get_by_role("button", name="Squad Command").is_visible():
                page.get_by_role("button", name="Squad Command").click()
            else:
                 # Try finding the link directly
                print("Navigating directly to /group-command")
                page.goto("http://localhost:5000/group-command")

            # Wait for "Yatra Command" or the group page to load
            expect(page.get_by_text("Yatra Command")).to_be_visible(timeout=10000)

            # Create Squad logic
            # We look for the "Create Squad" button in the toggle area
            print("Initializing Squad...")
            if page.get_by_role("button", name="Create Squad").is_visible():
                page.get_by_role("button", name="Create Squad").click()

                # Fill squad name
                page.get_by_placeholder("e.g. Alpha Team").fill("AAR Test Squad")

                # Click Initialize Squad (submit button)
                page.get_by_role("button", name="Initialize Squad").click()

                # Wait for success - title changes to "Squadron Overwatch"
                print("Waiting for Squadron Overwatch...")
                expect(page.get_by_text("Squadron Overwatch")).to_be_visible(timeout=10000)
                print("Squad created successfully.")

            else:
                print("Warning: Create Squad button not found. Assuming already in squad or wrong page state.")
                # Verify we are in a squad
                if not page.get_by_text("Squadron Overwatch").is_visible():
                     print("FAILED: Not in a squad and cannot create one.")
                     page.screenshot(path="verification/error_no_squad.png")
                     raise Exception("Squad creation failed")


            # 4. Navigate to Mission Debrief
            print("Navigating to Mission Debrief...")
            # Usually in the sidebar
            if page.get_by_role("link", name="Mission Debrief").is_visible():
                page.get_by_role("link", name="Mission Debrief").click()
            else:
                page.goto("http://localhost:5000/debrief")

            # 5. Check for "Tactical Replay" tab
            print("Checking for Tactical Replay tab...")
            # Wait for it to be visible AND enabled
            # Note: Playwright's to_be_enabled() checks for the 'disabled' attribute or property.

            replay_tab = page.get_by_text("Tactical Replay")
            expect(replay_tab).to_be_visible(timeout=10000)

            # We expect it to be enabled now that we have a squad
            # The Shadcn TabsTrigger renders a button with role="tab".
            # If disabled, it has disabled="" attribute.

            # Wait a moment for the query to fetch group data and enable the tab
            page.wait_for_timeout(2000)

            if not replay_tab.is_enabled():
                print("ERROR: Tactical Replay tab is still disabled despite having a squad.")
                page.screenshot(path="verification/error_tab_disabled.png")
                raise Exception("Tab disabled")

            # 6. Click Tab
            print("Clicking Tactical Replay tab...")
            replay_tab.click()

            # 7. Take Screenshot
            print("Taking screenshot...")
            # Wait a bit for map to load (even if empty)
            page.wait_for_timeout(2000)

            # Check if "No tactical telemetry available" or the map is there
            if page.get_by_text("No tactical telemetry available").is_visible():
                 print("Confirmed: Replay loaded (empty state).")
            else:
                 print("Confirmed: Replay loaded (map view).")

            page.screenshot(path="verification/aar_verification.png")
            print("Screenshot saved to verification/aar_verification.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            # Take error screenshot
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_aar_playback()
