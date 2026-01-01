from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        print("Navigating to home page...")
        try:
            page.goto("http://localhost:5000")

            # Wait for content to load
            expect(page.get_by_role("heading", name="Sacred Steps")).to_be_visible(timeout=10000)

            # Check if we are already logged in
            continue_btn = page.get_by_role("button", name="Continue Journey")
            if continue_btn.is_visible():
                print("User appears to be logged in. Logging out first...")
                continue_btn.click()
                expect(page.get_by_text("Your Spiritual Journey")).to_be_visible()

                logout_btn = page.get_by_role("button", name="Logout")
                if logout_btn.is_visible():
                    logout_btn.click()
                    print("Logged out successfully.")
                    page.goto("http://localhost:5000")

            print("Verifying Auth Page access...")
            start_btn = page.get_by_role("button", name="Start Pilgrimage")
            expect(start_btn).to_be_visible()
            start_btn.click()

            # Should be on Auth Page now
            print("Waiting for 'Welcome to Sacred Steps'...")
            expect(page.get_by_text("Welcome to Sacred Steps")).to_be_visible(timeout=5000)
            print("Auth Page verified.")

            # Now try to register a user
            print("Attempting registration...")
            page.get_by_role("tab", name="Register").click()
            # Randomize username to avoid conflicts on subsequent runs if server persists
            import random
            username = f"pilgrim_{random.randint(1000, 9999)}"
            print(f"Registering as {username}...")
            page.get_by_placeholder("Choose a username").fill(username)
            page.get_by_label("Password").fill("password123")
            page.get_by_role("button", name="Register").click()

            # Should redirect to Home (because AuthPage redirects to /)
            print("Waiting for redirect to Home...")
            expect(page.get_by_role("heading", name="Sacred Steps")).to_be_visible(timeout=5000)

            # Now click "Continue Journey"
            print("Clicking 'Continue Journey'...")
            continue_btn = page.get_by_role("button", name="Continue Journey")
            expect(continue_btn).to_be_visible()
            continue_btn.click()

            # Now expect Dashboard
            print("Waiting for Dashboard...")
            expect(page.get_by_text("Your Spiritual Journey")).to_be_visible(timeout=5000)
            print("Dashboard verified.")

            print("Taking success screenshot...")
            page.screenshot(path="verification/success.png")

        except Exception as e:
            print(f"Error: {e}")
            print(f"Current URL: {page.url}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
