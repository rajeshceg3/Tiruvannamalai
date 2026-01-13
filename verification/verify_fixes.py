import time
from playwright.sync_api import sync_playwright, expect

def verify_fixes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mock location at Indra Lingam
        context = browser.new_context(
            geolocation={"latitude": 12.2353, "longitude": 79.0847, "accuracy": 10},
            permissions=["geolocation"]
        )
        page = context.new_page()

        # 1. Login
        page.goto("http://localhost:5000/auth")
        page.get_by_role("tab", name="Register").click()
        page.fill('input[name="username"]', "testuser_fixes_2")
        page.fill('input[name="password"]', "password123")
        page.get_by_role("button", name="Register").click()
        page.wait_for_url("**/dashboard")

        # 2. Test Optimistic UI in Dashboard
        print("Testing Optimistic UI on Dashboard...")
        # Click "Check In" on first shrine
        # We need to find the button for Indra Lingam.
        # ShrineList probably renders them in order.
        # "Check In" button inside the card.
        check_in_btns = page.get_by_role("button", name="Check In")
        if check_in_btns.count() > 0:
            check_in_btns.first.click()
            print("Clicked Check In.")

            # Wait for VisitCard to appear
            # VisitCard has "Your Reflection"
            page.wait_for_selector("text=Your Reflection", timeout=5000)

            # Find the Save button in that card
            save_btn = page.get_by_role("button", name="Syncing...")
            # Or if it already synced, it might be "Save" again.
            # But "Syncing..." is what we expect for ID -1.
            # If network is fast, it might flick to "Save" quickly.
            # But let's check if we can see it.

            # Actually, without network throttling, it might be instant.
            # But we can check if the button exists.

            # Let's check for the button with title "Syncing..." or "Save note"
            # Our code: title={visit.id === -1 ? "Syncing..." : "Save note"}
            # We can try to get by title.

            # Wait a bit to ensure UI renders
            time.sleep(0.5)

            # Just take a screenshot here to manual verification
            page.screenshot(path="verification/dashboard_optimistic.png")
            print("Captured dashboard optimistic UI state.")

        else:
            print("No Check In buttons found!")

        # 3. Test Pathfinder (Geo Refactor)
        print("Testing Pathfinder...")
        page.goto("http://localhost:5000/pathfinder")

        # Should load Compass
        page.wait_for_selector("text=Pilgrim's Pathfinder")

        # Since we are at Indra Lingam, it should be the target (first unvisited).
        # We just checked in on dashboard, so it might be visited now?
        # Yes, if we clicked Check In, we visited it (virtually).
        # So "Indra Lingam" might be marked visited.
        # Let's see if Pathfinder handles visited state.
        # Code: hasVisited={hasVisitedTarget} -> Button "Already Visited"

        page.wait_for_selector("text=Target Locked")

        # Check if button says "Already Visited"
        if page.get_by_text("Already Visited").is_visible():
            print("Indra Lingam shows as Already Visited (Correct).")
        else:
            # Maybe it picked another shrine as target?
            print("Button state: ", page.get_by_role("button").first.inner_text())

        # Let's try to target the NEXT shrine (Agni Lingam)
        # Switch tab to "Target List"
        page.get_by_role("tab", name="Target List").click()

        # Click Agni Lingam
        page.get_by_text("Agni Lingam").click()

        # Switch back to compass (Wait, does clicking card set target? Yes: onClick={() => setSelectedShrineId(shrine.id)})
        # The tabs content is conditional? No, tabs content is always rendered but hidden?
        # No, TabsContent value="compass".
        # We need to switch back to "Navigation" tab to see compass.
        page.get_by_role("tab", name="Navigation").click()

        # Now targeting Agni Lingam.
        # Agni Lingam is at 12.2253, 79.0897
        # We are at 12.2353, 79.0847 (Indra)
        # Distance should be around 1.2km
        # So button should say "Xm to Target" and be disabled (or secondary).
        # And NOT "Verify Presence".

        page.wait_for_selector("text=Agni Lingam")
        btn = page.locator("button:has-text('m to Target')")

        if btn.is_visible():
            print("Agni Lingam correctly shows distance (Geo logic working).")
            print(f"Button text: {btn.inner_text()}")
        else:
            print("Could not find distance button for Agni Lingam.")

        page.screenshot(path="verification/pathfinder_geo.png")
        print("Captured pathfinder state.")

        browser.close()

if __name__ == "__main__":
    verify_fixes()
