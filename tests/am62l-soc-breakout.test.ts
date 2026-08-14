import { expect, test } from "bun:test"
import { BreakoutPointSolver } from "lib/index"
import type { BreakoutPointSolverInput } from "lib/types"
import fixtureJson from "./assets/am62l-soc-breakout.input.json"

const fixture = fixtureJson as BreakoutPointSolverInput

test("places every AM62L DDR breakout point on the boundary", () => {
  const solver = new BreakoutPointSolver(fixture)

  solver.solve()

  expect(fixture.traces).toHaveLength(33)
  expect(solver).toMatchSolverSnapshot(import.meta.path, {
    svgWidth: 1280,
    svgHeight: 1280,
  })
  expect(solver.getOutput().breakoutPoints).toHaveLength(33)
})
