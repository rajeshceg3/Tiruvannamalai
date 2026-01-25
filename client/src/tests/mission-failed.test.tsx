import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MissionFailed } from "@/components/ui/mission-failed";
import React from "react";

describe("MissionFailed Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the error title and message", () => {
    render(<MissionFailed onRetry={() => {}} />);
    expect(screen.getByText("DATA RETRIEVAL FAILED")).toBeDefined();
    expect(screen.getByText("Tactical data link could not be established.")).toBeDefined();
  });

  it("renders specific error message if provided", () => {
    const error = new Error("Connection timed out");
    render(<MissionFailed onRetry={() => {}} error={error} />);
    expect(screen.getByText("ERR: Connection timed out")).toBeDefined();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<MissionFailed onRetry={onRetry} />);

    const button = screen.getByText("RE-ESTABLISH LINK");
    fireEvent.click(button);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
