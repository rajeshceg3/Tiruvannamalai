from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            print("Navigating to auth page...")
            page.goto("http://localhost:5000/auth")

            # Wait for form to appear
            page.wait_for_selector("form", timeout=10000)

            # Switch to Register tab
            print("Switching to Register tab...")
            page.get_by_role("tab", name="Register").click()

            # Verify we are on register tab (check for unique text or verify button text)
            # The register button says "Register" or "Creating account..."
            # The login button says "Login" or "Logging in..."

            # Fill form - we need to target the visible inputs specifically if there are duplicates
            # Using specific selectors based on the active tab content

            print("Filling registration form...")
            # We can scope to the visible form
            register_form = page.locator("div[role='tabpanel'][data-state='active'] form")
            if not register_form.is_visible():
                 # Fallback if role is not tabpanel (radix uses tabpanel)
                 register_form = page.locator("form").nth(1) # Assuming second form is register

            register_form.locator('input[name="username"]').fill("commander")
            register_form.locator('input[name="password"]').fill("password123")

            # Click submit button
            print("Submitting registration form...")
            register_form.locator("button[type='submit']").click()

            # Wait for redirect to dashboard (/)
            try:
                page.wait_for_url("http://localhost:5000/dashboard", timeout=5000)
                print("Redirected to dashboard")
            except:
                try:
                    page.wait_for_url("http://localhost:5000/", timeout=5000)
                    print("Redirected to root")
                except:
                    print("Redirect check timed out, checking current URL...")
                    print(f"Current URL: {page.url}")

                    # Check for error
                    if page.get_by_text("Username already exists").is_visible():
                        print("User exists, trying login...")
                        page.get_by_role("tab", name="Login").click()
                        login_form = page.locator("div[role='tabpanel'][data-state='active'] form")
                        login_form.locator('input[name="username"]').fill("commander")
                        login_form.locator('input[name="password"]').fill("password123")
                        login_form.locator("button[type='submit']").click()
                        page.wait_for_url("http://localhost:5000/dashboard", timeout=10000)
                        print("Logged in")


            # Navigate to command center
            print("Navigating to Command Center...")
            page.goto("http://localhost:5000/group-command")

            # Check if we need to create a squad
            try:
                # "Yatra Command" heading means no group selected/created
                # Wait a bit for loading
                page.wait_for_load_state("networkidle")

                if page.get_by_text("Yatra Command").is_visible():
                    print("Creating Squad...")
                    # Assuming Create Squad is default tab or switch to it
                    create_tab = page.get_by_text("Create Squad")
                    if create_tab.is_visible():
                        create_tab.click()

                    page.fill('input[placeholder="e.g. Alpha Team"]', "Alpha Squad")
                    page.click("text=Initialize Squad")
                    print("Clicked Initialize Squad")

                    # Wait for creation to complete
                    page.wait_for_selector("text=Squadron Overwatch", timeout=10000)
                    print("Created Alpha Squad")
            except Exception as e:
                print(f"Skipped squad creation or error: {e}")

            # Verify command center elements
            print("Waiting for Squadron Overwatch...")
            page.wait_for_selector("text=Squadron Overwatch", timeout=10000)
            print("Command Center loaded")

            # Verify socket connection via status indicator
            time.sleep(2)

            screenshot_path = "verification/group_command.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
