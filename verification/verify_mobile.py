
from playwright.sync_api import sync_playwright
import random

def verify_dashboard_mobile(page):
    page.goto("http://localhost:5000/auth")

    suffix = random.randint(10000, 99999)
    username = f"testuser{suffix}"

    # Click Register Tab using text
    page.get_by_role("tab", name="Register").click()

    # Fill Register Form
    # Using get_by_role for inputs might be ambiguous if both forms are in DOM
    # But usually only one is visible.

    page.get_by_role("tabpanel", name="Register").get_by_label("Username").fill(username)
    page.get_by_role("tabpanel", name="Register").get_by_label("Password").fill("password123")

    # Submit
    page.get_by_role("tabpanel", name="Register").get_by_role("button", name="Register").click()

    # Wait for navigation
    page.wait_for_url("**/dashboard")

    # Mobile Viewport
    page.set_viewport_size({"width": 375, "height": 667})

    # Screenshot header
    page.screenshot(path="verification/mobile_dashboard.png")

    # Open Menu
    page.get_by_role("button", name="Toggle menu").click()

    # Wait for sidebar content
    # We can check for a navigation link
    page.get_by_role("link", name="Pathfinder").wait_for()

    # Screenshot Sidebar
    page.screenshot(path="verification/mobile_sidebar_open.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_dashboard_mobile(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
