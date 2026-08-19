import { expect, test } from "bun:test"
import { BreakoutPointSolver } from "lib/index"
import type { BreakoutPointSolverInput } from "lib/types"
import fixture from "./assets/breakout-sot23-regulator-power-rail.input.json"

test("solves sot23 regulator breakout points to input and output headers", () => {
  const solver = new BreakoutPointSolver(fixture as BreakoutPointSolverInput)

  solver.solve()

  expect(solver.getOutput().breakoutPoints).toEqual([
    {
      sourcePortId: "source_port_u1_vin",
      sourceTraceId: "source_trace_jin_vin_to_u1_vin",
      x: -4.68,
      y: 0.10000000000000009,
      layer: "top",
    },
    {
      sourcePortId: "source_port_u1_gnd",
      sourceTraceId: "source_trace_jin_gnd_to_u1_gnd",
      x: -1.1375,
      y: -2.4,
      layer: "top",
    },
    {
      sourcePortId: "source_port_u1_gnd",
      sourceTraceId: "source_trace_jout_gnd_to_u1_gnd",
      x: -1.1375,
      y: -2.4,
      layer: "top",
    },
    {
      sourcePortId: "source_port_u1_vout",
      sourceTraceId: "source_trace_jout_vout_to_u1_vout",
      x: 4.68,
      y: -0.9860821155184412,
      layer: "top",
    },
  ])
  expect(solver).toMatchSolverSnapshot(import.meta.path)
})
