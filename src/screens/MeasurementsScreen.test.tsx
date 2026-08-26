import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MeasurementFrame } from "../models/measurement";
import { MeasurementsScreen } from "./MeasurementsScreen";

afterEach(cleanup);

const frames: Record<string, MeasurementFrame> = {
  main: {
    sourceId: "main",
    timestamp: 1,
    frequencyHz: [100, 1_000],
    magnitudeDb: [-6, -3],
    phaseDeg: [10, -20],
    coherence: [0.9, 0.98],
  },
  sub: {
    sourceId: "sub",
    timestamp: 1,
    frequencyHz: [100, 1_000],
    magnitudeDb: [-9, -12],
    phaseDeg: [40, 10],
    coherence: [0.8, 0.95],
    delayMs: 2.4,
    splDb: 94.5,
  },
};

const sources = [
  { id: "main", name: "Main PA", host: "local", objectName: "Measurement" },
  { id: "sub", name: "Sub", host: "local", objectName: "Measurement" },
];

const baseProps = {
  sources,
  frames,
  primarySourceId: "main",
  overlaySourceIds: ["sub"],
  recording: false,
  onPrimarySourceChange: vi.fn(),
  onToggleOverlay: vi.fn(),
  onStartRecording: vi.fn(),
  onStopRecording: vi.fn(),
  onReplayFixture: vi.fn(),
};

describe("MeasurementsScreen", () => {
  it("renders the approved magnitude, phase, and coherence hierarchy", () => {
    render(<MeasurementsScreen {...baseProps} />);

    expect(screen.getByRole("img", { name: "Magnitude plot" })).toHaveClass(
      "measurement-plot--dominant",
    );
    expect(screen.getByRole("img", { name: "Phase plot" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Coherence plot" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("trace-sub")).toHaveLength(3);
  });

  it("selects a primary source and toggles overlays", () => {
    const onPrimarySourceChange = vi.fn();
    const onToggleOverlay = vi.fn();
    render(
      <MeasurementsScreen
        {...baseProps}
        onPrimarySourceChange={onPrimarySourceChange}
        onToggleOverlay={onToggleOverlay}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Sub primary" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Sub overlay" }));

    expect(onPrimarySourceChange).toHaveBeenCalledWith("sub");
    expect(onToggleOverlay).toHaveBeenCalledWith("sub");
  });

  it("uses explicit Record and Stop controls", () => {
    const onStartRecording = vi.fn();
    const { rerender } = render(
      <MeasurementsScreen {...baseProps} onStartRecording={onStartRecording} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Record fixture" }));
    expect(onStartRecording).toHaveBeenCalledOnce();

    const onStopRecording = vi.fn();
    rerender(
      <MeasurementsScreen
        {...baseProps}
        recording
        onStopRecording={onStopRecording}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    expect(onStopRecording).toHaveBeenCalledOnce();
  });

  it("labels absent delay and SPL as unavailable", () => {
    render(<MeasurementsScreen {...baseProps} overlaySourceIds={[]} />);
    expect(screen.getByText("Delay unavailable")).toBeInTheDocument();
    expect(screen.getByText("SPL unavailable")).toBeInTheDocument();
  });
});
