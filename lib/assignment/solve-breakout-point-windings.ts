import type { Point } from "@tscircuit/math-utils"
import type { BreakoutPointSolverInput } from "../types"
import { completeBreakoutPointAssignments } from "./complete-breakout-point-assignments"
import {
  countBreakoutPointInsideWindings,
  countBreakoutPointWindings,
  createBreakoutPointAssignmentScoringContext,
  type BreakoutPointAssignment,
} from "./get-breakout-point-assignment-cost"
import {
  getBreakoutPointRequests,
  type BreakoutPointRequest,
  type InsidePortKey,
} from "./get-breakout-point-requests"
import { improveBreakoutPointAssignments } from "./improve-breakout-point-assignments"
import { solveBreakoutPointAssignmentBeam } from "./solve-breakout-point-assignment-beam"
import { solveGreedyBreakoutPointAssignments } from "./solve-greedy-breakout-point-assignments"

const getAssignmentsFromBoundaryPoints = ({
  breakoutPointRequests,
  boundaryPointsByInsidePortKey,
}: {
  breakoutPointRequests: BreakoutPointRequest[]
  boundaryPointsByInsidePortKey: ReadonlyMap<InsidePortKey, Point>
}) =>
  breakoutPointRequests.flatMap((request) => {
    const boundaryPoint = boundaryPointsByInsidePortKey.get(
      request.insidePortKey,
    )
    return boundaryPoint ? [{ request, boundaryPoint }] : []
  })

const getBoundaryPointsFromAssignments = (
  assignments: BreakoutPointAssignment[],
) => {
  const boundaryPointsByInsidePortKey = new Map<InsidePortKey, Point>()
  for (const assignment of assignments) {
    boundaryPointsByInsidePortKey.set(
      assignment.request.insidePortKey,
      assignment.boundaryPoint,
    )
  }
  return boundaryPointsByInsidePortKey
}

const hasFewerBreakoutPointWindings = (
  candidateAssignments: BreakoutPointAssignment[],
  currentAssignments: BreakoutPointAssignment[],
) => {
  const candidateInsideWindingCount =
    countBreakoutPointInsideWindings(candidateAssignments)
  const currentInsideWindingCount =
    countBreakoutPointInsideWindings(currentAssignments)
  if (candidateInsideWindingCount !== currentInsideWindingCount) {
    return candidateInsideWindingCount < currentInsideWindingCount
  }
  return (
    countBreakoutPointWindings(candidateAssignments) <
    countBreakoutPointWindings(currentAssignments)
  )
}

/**
 * Selects board-world breakout points in millimeters. Target positions and pad
 * obstacles guide candidate placement. Inside escape windings receive strict
 * priority, then target-guide windings rank the remaining assignments. The
 * fanout solver remains responsible for physically routing each escape to the
 * fixed endpoint selected here.
 */
export function solveBreakoutPointWindings(input: BreakoutPointSolverInput) {
  const breakoutPointRequests = getBreakoutPointRequests(input.traces)
  const greedyBoundaryPointsByInsidePortKey =
    solveGreedyBreakoutPointAssignments(input)
  const greedyAssignments = getAssignmentsFromBoundaryPoints({
    breakoutPointRequests,
    boundaryPointsByInsidePortKey: greedyBoundaryPointsByInsidePortKey,
  })
  if (
    greedyAssignments.length === breakoutPointRequests.length &&
    countBreakoutPointWindings(greedyAssignments) === 0
  ) {
    return greedyBoundaryPointsByInsidePortKey
  }

  const scoringContext = createBreakoutPointAssignmentScoringContext(input)
  const globallyConstructedAssignments: BreakoutPointAssignment[] = []
  completeBreakoutPointAssignments(
    {
      assignments: globallyConstructedAssignments,
      breakoutPointRequests,
    },
    scoringContext,
  )

  const completedGreedyAssignments = [...greedyAssignments]
  completeBreakoutPointAssignments(
    {
      assignments: completedGreedyAssignments,
      breakoutPointRequests,
    },
    scoringContext,
  )

  let preferredAssignments = hasFewerBreakoutPointWindings(
    globallyConstructedAssignments,
    completedGreedyAssignments,
  )
    ? globallyConstructedAssignments
    : completedGreedyAssignments
  const alternateAssignments =
    preferredAssignments === globallyConstructedAssignments
      ? completedGreedyAssignments
      : globallyConstructedAssignments

  if (countBreakoutPointWindings(preferredAssignments) > 0) {
    improveBreakoutPointAssignments(preferredAssignments, scoringContext)
  }
  if (countBreakoutPointWindings(preferredAssignments) > 0) {
    improveBreakoutPointAssignments(alternateAssignments, scoringContext)
    if (
      hasFewerBreakoutPointWindings(alternateAssignments, preferredAssignments)
    ) {
      preferredAssignments = alternateAssignments
    }
  }
  if (countBreakoutPointWindings(preferredAssignments) > 0) {
    const beamAssignments = solveBreakoutPointAssignmentBeam(
      breakoutPointRequests,
      scoringContext,
    )
    if (hasFewerBreakoutPointWindings(beamAssignments, preferredAssignments)) {
      preferredAssignments = beamAssignments
    }
  }

  return getBoundaryPointsFromAssignments(preferredAssignments)
}
