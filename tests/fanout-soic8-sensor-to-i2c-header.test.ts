import { expect, test } from "bun:test"
import { BreakoutPointSolver } from "lib/index"
import type { BreakoutPointSolverInput } from "lib/types"
import fixture from "./assets/fanout-soic8-sensor-to-i2c-header.input.json"

test("solves soic8 fanout points to i2c header pins with pullups nearby", () => {
  const solver = new BreakoutPointSolver(fixture as BreakoutPointSolverInput)

  solver.solve()

  expect(solver.getOutput().breakoutPoints).toEqual([
    {
      sourcePortId: "source_port_u1_vcc",
      sourceTraceId: "source_trace_j1_vcc_to_u1_vcc",
      x: -4.400000000000002,
      y: -2.6880368098159515,
      layer: "top",
    },
    {
      sourcePortId: "source_port_u1_gnd",
      sourceTraceId: "source_trace_j1_gnd_to_u1_gnd",
      x: -3.4000000000000004,
      y: -3.2,
      layer: "top",
    },
    {
      sourcePortId: "source_port_u1_sda",
      sourceTraceId: "source_trace_j1_sda_to_u1_sda",
      x: -4.4,
      y: 1.5338961038961039,
      layer: "top",
    },
    {
      sourcePortId: "source_port_u1_scl",
      sourceTraceId: "source_trace_j1_scl_to_u1_scl",
      x: -1.9000000000000004,
      y: 3.2,
      layer: "top",
    },
  ])
  expect(solver).toMatchSolverSnapshot(import.meta.path)
})
