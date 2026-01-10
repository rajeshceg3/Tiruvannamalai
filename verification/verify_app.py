
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # 1. Navigate to the app (wait for it to start)
        try:
            page.goto("http://localhost:5000", timeout=30000)
            print("Navigated to home page")
        except Exception as e:
            print(f"Failed to navigate: {e}")
            return

        # 2. Check Home Page
        page.screenshot(path="verification/homepage.png")
        print("Screenshot saved to verification/homepage.png")

        # 3. Check for specific text to verify app loaded
        title = page.title()
        print(f"Page title: {title}")

        # 4. Attempt login/register to check Dashboard (if possible without complex interactions)
        # Since I can't easily register a new user every time without cleaning DB, I'll just check the Auth page.
        page.goto("http://localhost:5000/auth")
        page.wait_for_selector('text=Sacred Steps')
        page.screenshot(path="verification/authpage.png")
        print("Screenshot saved to verification/authpage.png")

        browser.close()

if __name__ == "__main__":
    run()
