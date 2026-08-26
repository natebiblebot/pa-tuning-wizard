import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MeasurementPlot } from "./MeasurementPlot";

afterEach(cleanup);

describe("MeasurementPlot", () => {
  it("renders an accessible, dominant logarithmic-frequency plot", () => {
    render(
      <MeasurementPlot
        title="Magnitude"
        unit="dB"
        dominant
        series={[
          {
            id: "main",
            label: "Main PA",
            color: "#f2ad3d",
            frequencyHz: [20, 200, 2_000, 20_000],
            values: [-12, -6, -3, -9],
          },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "Magnitude plot" })).toHaveClass(
      "measurement-plot--dominant",
    );
    expect(screen.getByTestId("trace-main")).toHaveAttribute("points");
    expect(screen.getByText("20 Hz")).toBeInTheDocument();
    expect(screen.getByText("20 kHz")).toBeInTheDocument();
  });

  it("shows an explicit empty state when no valid series are available", () => {
    render(<MeasurementPlot title="Phase" unit="°" series={[]} />);
    expect(
      screen.getByText("Waiting for measurement data"),
    ).toBeInTheDocument();
  });
});
