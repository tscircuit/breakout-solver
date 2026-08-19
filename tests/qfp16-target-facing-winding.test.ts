import { expect, test } from "bun:test"
import { BreakoutPointSolver } from "lib/index"
import type { BreakoutPointSolverInput } from "lib/types"
import { countBreakoutPointInsideWindings } from "lib/assignment/get-breakout-point-assignment-cost"
import { getBreakoutPointRequests } from "lib/assignment/get-breakout-point-requests"
import { doesEscapeGuideReversePerimeterPadDirection } from "lib/component/does-escape-guide-reverse-perimeter-pad-direction"
import fixture from "./assets/breakout-qfp16-with-header-and-passives.input.json"

test("repro: qfp16 breakout points avoid winding around the package", () => {
  const solver = new BreakoutPointSolver(fixture as BreakoutPointSolverInput)

  solver.solve()

  const breakoutPointAssignments = getBreakoutPointRequests(
    fixture.traces as BreakoutPointSolverInput["traces"],
  ).flatMap((request) => {
    const breakoutPoint = solver
      .getOutput()
      .breakoutPoints.find(
        (point) =>
          point.sourcePortId === request.insidePort.sourcePortId &&
          (point.layer ?? "top") === (request.insidePort.layer ?? "top"),
      )
    return breakoutPoint
      ? [
          {
            request,
            boundaryPoint: { x: breakoutPoint.x, y: breakoutPoint.y },
          },
        ]
      : []
  })

  expect(breakoutPointAssignments).toHaveLength(fixture.traces.length)
  expect(countBreakoutPointInsideWindings(breakoutPointAssignments)).toBe(0)
  for (const assignment of breakoutPointAssignments) {
    expect(
      doesEscapeGuideReversePerimeterPadDirection({
        insidePort: assignment.request.insidePort,
        boundaryPoint: assignment.boundaryPoint,
        components:
          fixture.components as BreakoutPointSolverInput["components"],
      }),
    ).toBe(false)
  }
  expect(solver).toMatchSolverSnapshot(import.meta.path)
})
