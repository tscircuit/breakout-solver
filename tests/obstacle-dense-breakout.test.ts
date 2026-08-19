import { expect, test } from "bun:test"
import { BreakoutPointSolver } from "lib/index"

test("solves dense breakout points around many blocking pads", () => {
  const solver = new BreakoutPointSolver({
    bounds: { minX: -6, maxX: 6, minY: -5, maxY: 5 },
    boundaryPointSpacing: 0.5,
    usedBoundaryPoints: [
      { x: 6, y: -1 },
      { x: 6, y: 1 },
      { x: -6, y: 0.5 },
      { x: -1, y: 5 },
      { x: 1, y: -5 },
    ],
    traces: [
      {
        sourceTraceId: "source_trace_right_1",
        insidePorts: [
          {
            sourcePortId: "source_port_right_1",
            position: { x: 1.6, y: -1.2 },
            width: 0.55,
            height: 0.32,
          },
        ],
        outsidePorts: [
          {
            sourcePortId: "source_port_header_right_1",
            position: { x: 11, y: -1.8 },
          },
        ],
      },
      {
        sourceTraceId: "source_trace_right_2",
        insidePorts: [
          {
            sourcePortId: "source_port_right_3",
            position: { x: 1.6, y: 0.4 },
            width: 0.55,
            height: 0.32,
          },
        ],
        outsidePorts: [
          {
            sourcePortId: "source_port_header_right_2",
            position: { x: 11, y: 1.2 },
          },
        ],
      },
      {
        sourceTraceId: "source_trace_left_1",
        insidePorts: [
          {
            sourcePortId: "source_port_left_1",
            position: { x: -1.6, y: -1.2 },
            width: 0.55,
            height: 0.32,
          },
        ],
        outsidePorts: [
          {
            sourcePortId: "source_port_header_left_1",
            position: { x: -11, y: -1.6 },
          },
        ],
      },
      {
        sourceTraceId: "source_trace_left_2",
        insidePorts: [
          {
            sourcePortId: "source_port_left_4",
            position: { x: -1.6, y: 1.2 },
            width: 0.55,
            height: 0.32,
          },
        ],
        outsidePorts: [
          {
            sourcePortId: "source_port_header_left_2",
            position: { x: -11, y: 1.5 },
          },
        ],
      },
      {
        sourceTraceId: "source_trace_top_1",
        insidePorts: [
          {
            sourcePortId: "source_port_top_1",
            position: { x: -1.2, y: 1.6 },
            width: 0.32,
            height: 0.55,
          },
        ],
        outsidePorts: [
          {
            sourcePortId: "source_port_header_top_1",
            position: { x: -2.2, y: 10 },
          },
        ],
      },
      {
        sourceTraceId: "source_trace_top_2",
        insidePorts: [
          {
            sourcePortId: "source_port_top_4",
            position: { x: 1.2, y: 1.6 },
            width: 0.32,
            height: 0.55,
          },
        ],
        outsidePorts: [
          {
            sourcePortId: "source_port_header_top_2",
            position: { x: 2.4, y: 10 },
          },
        ],
      },
      {
        sourceTraceId: "source_trace_bottom_1",
        insidePorts: [
          {
            sourcePortId: "source_port_bottom_1",
            position: { x: -1.2, y: -1.6 },
            width: 0.32,
            height: 0.55,
          },
        ],
        outsidePorts: [
          {
            sourcePortId: "source_port_header_bottom_1",
            position: { x: -2.4, y: -10 },
          },
        ],
      },
      {
        sourceTraceId: "source_trace_bottom_2",
        insidePorts: [
          {
            sourcePortId: "source_port_bottom_4",
            position: { x: 1.2, y: -1.6 },
            width: 0.32,
            height: 0.55,
          },
        ],
        outsidePorts: [
          {
            sourcePortId: "source_port_header_bottom_2",
            position: { x: 2.4, y: -10 },
          },
        ],
      },
    ],
    pads: [
      {
        center: { x: 3.2, y: -0.35 },
        width: 1.1,
        height: 0.9,
        clearance: 0.1,
        label: "right lower blocking pad",
      },
      {
        center: { x: 3.5, y: 0.9 },
        width: 0.9,
        height: 1.7,
        ccwRotationDegrees: 30,
        label: "right rotated blocking pad",
      },
      {
        center: { x: -3.2, y: -1.2 },
        width: 1.1,
        height: 1.1,
        label: "left lower blocking pad",
      },
      {
        center: { x: -3.4, y: 1.3 },
        width: 0.9,
        height: 1.5,
        ccwRotationDegrees: -25,
        label: "left rotated blocking pad",
      },
      {
        center: { x: -1.6, y: 3.2 },
        width: 1.4,
        height: 1.1,
        label: "top left blocking pad",
      },
      {
        center: { x: 1.8, y: 3.2 },
        width: 1.2,
        height: 1.2,
        label: "top right blocking pad",
      },
      {
        center: { x: -1.8, y: -3.2 },
        width: 1.2,
        height: 1.2,
        ccwRotationDegrees: 20,
        label: "bottom left rotated blocking pad",
      },
      {
        center: { x: 1.8, y: -3.2 },
        width: 1.2,
        height: 1.2,
        label: "bottom right blocking pad",
      },
      {
        center: { x: 1.6, y: 0.4 },
        width: 0.8,
        height: 0.8,
        sourcePortIds: ["source_port_right_3"],
        label: "right self pad",
      },
      {
        center: { x: -1.2, y: -1.6 },
        width: 0.8,
        height: 0.8,
        sourcePortIds: ["source_port_bottom_1"],
        label: "bottom self pad",
      },
    ],
  })

  solver.solve()

  expect(solver.getOutput()).toEqual({
    breakoutPoints: [
      {
        sourcePortId: "source_port_right_1",
        sourceTraceId: "source_trace_right_1",
        x: 6,
        y: -1.5,
      },
      {
        sourcePortId: "source_port_right_3",
        sourceTraceId: "source_trace_right_2",
        x: 6,
        y: 0.5,
      },
      {
        sourcePortId: "source_port_left_1",
        sourceTraceId: "source_trace_left_1",
        x: -6,
        y: -1.3872340425531915,
      },
      {
        sourcePortId: "source_port_left_4",
        sourceTraceId: "source_trace_left_2",
        x: -6,
        y: 1.3404255319148937,
      },
      {
        sourcePortId: "source_port_top_1",
        sourceTraceId: "source_trace_top_1",
        x: -1.6047619047619048,
        y: 5,
      },
      {
        sourcePortId: "source_port_top_4",
        sourceTraceId: "source_trace_top_2",
        x: 1.2,
        y: 5,
      },
      {
        sourcePortId: "source_port_bottom_1",
        sourceTraceId: "source_trace_bottom_1",
        x: -0.5,
        y: -5,
      },
      {
        sourcePortId: "source_port_bottom_4",
        sourceTraceId: "source_trace_bottom_2",
        x: 0.5,
        y: -5,
      },
    ],
  })
  expect(solver).toMatchSolverSnapshot(import.meta.path)
})
