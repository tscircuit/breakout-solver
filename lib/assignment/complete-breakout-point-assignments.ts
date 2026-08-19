import { getBreakoutBoundaryCandidates } from "./get-breakout-boundary-candidates"
import {
  getBreakoutPointAssignmentCost,
  type BreakoutPointAssignment,
  type BreakoutPointAssignmentScoringContext,
} from "./get-breakout-point-assignment-cost"
import type { BreakoutPointRequest } from "./get-breakout-point-requests"
import { candidateHasRequiredSpacing } from "./breakout-point-assignment-spacing"

export function completeBreakoutPointAssignments(
  {
    assignments,
    breakoutPointRequests,
  }: {
    assignments: BreakoutPointAssignment[]
    breakoutPointRequests: BreakoutPointRequest[]
  },
  scoringContext: BreakoutPointAssignmentScoringContext,
) {
  const { input } = scoringContext
  const assignedInsidePortKeys = new Set(
    assignments.map((assignment) => assignment.request.insidePortKey),
  )
  const boundaryPointSpacing = input.boundaryPointSpacing ?? 0

  for (const request of breakoutPointRequests) {
    if (assignedInsidePortKeys.has(request.insidePortKey)) continue

    const candidates = getBreakoutBoundaryCandidates({
      insidePort: request.insidePort,
      outsidePorts: request.outsidePorts,
      bounds: input.bounds,
      boundaryPointSpacing,
    })
    let bestAssignment: BreakoutPointAssignment | undefined
    let bestAssignmentCost = Number.POSITIVE_INFINITY

    for (const boundaryPoint of candidates) {
      if (
        !candidateHasRequiredSpacing({
          candidate: boundaryPoint,
          assignedBoundaryPoints: assignments.map(
            (assignment) => assignment.boundaryPoint,
          ),
          usedBoundaryPoints: input.usedBoundaryPoints ?? [],
          boundaryPointSpacing,
        })
      ) {
        continue
      }

      const assignment = { request, boundaryPoint }
      const assignmentCost = getBreakoutPointAssignmentCost(
        { assignment, assignments },
        scoringContext,
      )
      if (assignmentCost < bestAssignmentCost) {
        bestAssignment = assignment
        bestAssignmentCost = assignmentCost
      }
    }

    if (!bestAssignment) {
      throw new Error(
        `BreakoutPointSolver: no boundary assignment satisfies the required ${boundaryPointSpacing}mm spacing for ${request.insidePort.sourcePortId}`,
      )
    }

    assignments.push(bestAssignment)
    assignedInsidePortKeys.add(request.insidePortKey)
  }
}
