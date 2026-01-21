from playwright.sync_api import sync_playwright, expect
from nanoid import generate
import time
import os

def verify_checkin_toast():
    print("Starting verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            permissions=['geolocation'],
            geolocation={'latitude': 12.2353, 'longitude': 79.0847},
            viewport={'width': 1280, 'height': 800}
        )
        page = context.new_page()

        username = f"seal_{generate(size=4)}"
        password = "securepassword123"

        print(f"Registering user: {username}")
        page.goto("http://localhost:5000/auth")
        page.get_by_role("tab", name="Register").click()

        form = page.locator('div[role="tabpanel"][data-state="active"] form')
        form.locator('input[name="username"]').fill(username)
        form.locator('input[name="password"]').fill(password)
        form.locator('button[type="submit"]').click()

        print("Waiting for dashboard...")
        page.wait_for_url("**/dashboard")

        print("Locating Check In button...")
        check_in_btn = page.get_by_role("button", name="Check In").first
        expect(check_in_btn).to_be_visible()

        print("Clicking Check In...")
        check_in_btn.click()

        print("Waiting for toast...")
        toast = page.get_by_text("Location Verified!", exact=True)
        expect(toast).to_be_visible(timeout=10000)
        print("Toast visible!")

        # Verify state change
        print("Waiting for Visited state...")
        visited_btn = page.get_by_role("button", name="Visited").first
        expect(visited_btn).to_be_visible()

        # Wait for animation/settle
        page.wait_for_timeout(2000)

        print("Taking screenshot...")
        page.screenshot(path="/home/jules/verification/verification.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_checkin_toast()
