import type { Point } from "@tscircuit/math-utils"
import {
  getAvailableBreakoutBoundaryPoint,
  getAvailableBreakoutBoundaryPointForOutsidePorts,
} from "../boundary/get-available-breakout-boundary-point"
import { getBreakoutBoundaryIntersection } from "../boundary/get-breakout-boundary-intersection"
import type { BreakoutPointSolverInput } from "../types"
import {
  getBreakoutPointRequests,
  type InsidePortKey,
} from "./get-breakout-point-requests"

export function solveGreedyBreakoutPointAssignments(
  input: BreakoutPointSolverInput,
) {
  const boundaryPointsByInsidePortKey = new Map<InsidePortKey, Point>()

  for (const request of getBreakoutPointRequests(input.traces)) {
    const idealBoundaryPoints = request.outsidePorts.flatMap((outsidePort) => {
      const idealBoundaryPoint = getBreakoutBoundaryIntersection({
        from: request.insidePort.position,
        to: outsidePort.position,
        bounds: input.bounds,
      })
      return idealBoundaryPoint ? [idealBoundaryPoint] : []
    })
    if (idealBoundaryPoints.length === 0) continue

    const usedBoundaryPoints = [
      ...(input.usedBoundaryPoints ?? []),
      ...boundaryPointsByInsidePortKey.values(),
    ]
    let boundaryPoint: Point | null = null

    if (request.outsidePorts.length > 1) {
      boundaryPoint = getAvailableBreakoutBoundaryPointForOutsidePorts({
        idealPoints: idealBoundaryPoints,
        bounds: input.bounds,
        usedBoundaryPoints,
        boundaryPointSpacing: input.boundaryPointSpacing ?? 0,
        routeFrom: request.insidePort.position,
        pads: input.pads,
        sourcePortId: request.insidePort.sourcePortId,
        outsidePorts: request.outsidePorts,
        layer: request.insidePort.layer,
      })
    }

    boundaryPoint ??= getAvailableBreakoutBoundaryPoint({
      idealPoint: idealBoundaryPoints[0]!,
      bounds: input.bounds,
      usedBoundaryPoints,
      boundaryPointSpacing: input.boundaryPointSpacing ?? 0,
      routeFrom: request.insidePort.position,
      pads: input.pads,
      sourcePortId: request.insidePort.sourcePortId,
      layer: request.insidePort.layer,
    })
    if (!boundaryPoint) continue

    boundaryPointsByInsidePortKey.set(request.insidePortKey, boundaryPoint)
  }

  return boundaryPointsByInsidePortKey
}
