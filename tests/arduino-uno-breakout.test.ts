import { expect, test } from "bun:test"
import { BreakoutPointSolver } from "lib/index"
import type { BreakoutPointSolverInput } from "lib/types"
import fixtureJson from "./assets/arduino-uno-breakout.input.json"

const fixture = fixtureJson as BreakoutPointSolverInput

test("solves breakout points from real Arduino Uno circuit-json pads", () => {
  const solver = new BreakoutPointSolver(fixture)

  solver.solve()

  const breakoutPoints = solver.getOutput().breakoutPoints

  expect(fixture.traces).toHaveLength(22)
  expect(breakoutPoints).toEqual([
    {
      sourcePortId: "source_port_109",
      sourceTraceId: "source_trace_98",
      x: 8.300000000000002,
      y: 7.3,
      layer: "top",
    },
    {
      sourcePortId: "source_port_110",
      sourceTraceId: "source_trace_99",
      x: 8.950000000000003,
      y: 7.3,
      layer: "top",
    },
    {
      sourcePortId: "source_port_111",
      sourceTraceId: "source_trace_100",
      x: 9.86299544453128,
      y: 7.300000000000001,
      layer: "top",
    },
    {
      sourcePortId: "source_port_80",
      sourceTraceId: "source_trace_71",
      x: 12.20215587447357,
      y: 7.299999999999999,
      layer: "top",
    },
    {
      sourcePortId: "source_port_81",
      sourceTraceId: "source_trace_72",
      x: 16.100000000000005,
      y: 7.3,
      layer: "top",
    },
    {
      sourcePortId: "source_port_88",
      sourceTraceId: "source_trace_79",
      x: 17.5,
      y: 5.313385743692827,
      layer: "top",
    },
    {
      sourcePortId: "source_port_89",
      sourceTraceId: "source_trace_80",
      x: 14.150000000000006,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_90",
      sourceTraceId: "source_trace_81",
      x: 13.500000000000005,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_91",
      sourceTraceId: "source_trace_82",
      x: 8.950000000000003,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_92",
      sourceTraceId: "source_trace_83",
      x: 8.300000000000002,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_93",
      sourceTraceId: "source_trace_84",
      x: 7.650000000000002,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_94",
      sourceTraceId: "source_trace_85",
      x: 7.000000000000002,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_95",
      sourceTraceId: "source_trace_86",
      x: 6.350000000000001,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_96",
      sourceTraceId: "source_trace_87",
      x: 5.700000000000001,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_102",
      sourceTraceId: "source_trace_91",
      x: 4.4,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_103",
      sourceTraceId: "source_trace_92",
      x: 3.75,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_104",
      sourceTraceId: "source_trace_93",
      x: 3.1,
      y: -5.149999999999999,
      layer: "top",
    },
    {
      sourcePortId: "source_port_105",
      sourceTraceId: "source_trace_94",
      x: 3.1,
      y: -5.799999999999999,
      layer: "top",
    },
    {
      sourcePortId: "source_port_106",
      sourceTraceId: "source_trace_95",
      x: 3.1,
      y: -6.449999999999999,
      layer: "top",
    },
    {
      sourcePortId: "source_port_107",
      sourceTraceId: "source_trace_96",
      x: 7.650000000000002,
      y: 7.3,
      layer: "top",
    },
    {
      sourcePortId: "source_port_108",
      sourceTraceId: "source_trace_97",
      x: 3.1,
      y: -7.1,
      layer: "top",
    },
    {
      sourcePortId: "source_port_99",
      sourceTraceId: "source_trace_89",
      x: 5.050000000000001,
      y: -7.1,
      layer: "top",
    },
  ])
  expect(solver).toMatchSolverSnapshot(import.meta.path, {
    svgWidth: 1280,
    svgHeight: 1280,
  })
})
