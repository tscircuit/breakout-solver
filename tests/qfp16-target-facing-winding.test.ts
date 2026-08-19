import { expect, test } from "bun:test"
import { BreakoutPointSolver } from "lib/index"
import type { BreakoutPointSolverInput } from "lib/types"
import fixture from "./assets/breakout-qfp16-with-header-and-passives.input.json"

test("repro: qfp16 breakout points avoid winding around the package", () => {
  const solver = new BreakoutPointSolver(fixture as BreakoutPointSolverInput)

  solver.solve()

  expect(solver).toMatchSolverSnapshot(import.meta.path)
})
