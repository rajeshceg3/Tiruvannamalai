
from playwright.sync_api import sync_playwright
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Increase timeout for slow dev server
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        print("Navigating to home page...")
        try:
            page.goto("http://localhost:5000/", timeout=60000)

            # Wait for key elements
            print("Waiting for title...")
            page.wait_for_selector("text=Sacred Steps", timeout=30000)

            # Check for images without alt text or empty alt text
            print("Checking images...")
            images = page.locator("img").all()
            for i, img in enumerate(images):
                alt = img.get_attribute("alt")
                src = img.get_attribute("src")
                if not alt:
                    print(f"WARNING: Image {i} ({src}) has missing or empty alt text.")
                else:
                    print(f"Image {i} has alt text: {alt}")

            # Check for contrast issues (manual heuristic via script)
            # This is hard to do perfectly in script, but we can check if elements are visible

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/home_initial.png", full_page=True)

            # Check specific elements mentioned in memory
            # "Features Grid"
            if page.get_by_text("Ancient Wisdom").is_visible():
                print("Features Grid visible.")
            else:
                print("Features Grid NOT visible.")

            print("Frontend verification script finished successfully.")

        except Exception as e:
            print(f"ERROR: {e}")
            page.screenshot(path="verification/error.png")

        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
