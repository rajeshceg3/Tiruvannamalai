
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the home page
        try:
            await page.goto("http://localhost:5000", timeout=60000)

            # Wait for content to load
            await page.wait_for_selector("body", timeout=10000)

            # Since we are not logged in, we should see the home page
            await page.screenshot(path="verification/home.png")
            print("Screenshot taken: verification/home.png")

        except Exception as e:
            print(f"Error: {e}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
