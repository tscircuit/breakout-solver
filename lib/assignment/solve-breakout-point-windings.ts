import type { Point } from "@tscircuit/math-utils"
import type { BreakoutPointSolverInput } from "../types"
import { completeBreakoutPointAssignments } from "./complete-breakout-point-assignments"
import {
  countBreakoutPointWindings,
  countReversedPerimeterPadEscapes,
  createBreakoutPointAssignmentScoringContext,
  getBreakoutPointAssignmentsCost,
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

const hasLowerBreakoutPointAssignmentCost = (
  candidateAssignments: BreakoutPointAssignment[],
  currentAssignments: BreakoutPointAssignment[],
  scoringContext: ReturnType<
    typeof createBreakoutPointAssignmentScoringContext
  >,
) => {
  return (
    getBreakoutPointAssignmentsCost(candidateAssignments, scoringContext) <
    getBreakoutPointAssignmentsCost(currentAssignments, scoringContext)
  )
}

const hasUnresolvedBreakoutTopology = (
  assignments: BreakoutPointAssignment[],
  input: BreakoutPointSolverInput,
) =>
  countBreakoutPointWindings(assignments) > 0 ||
  countReversedPerimeterPadEscapes(assignments, input.components) > 0

/**
 * Selects board-world breakout points in millimeters. Target positions and pad
 * obstacles guide candidate placement. Inside escape windings receive strict
 * priority, followed by the outward direction of elongated perimeter leads,
 * then target-guide windings. The fanout solver remains responsible for
 * physically routing each escape to the fixed endpoint selected here.
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
    countBreakoutPointWindings(greedyAssignments) === 0 &&
    countReversedPerimeterPadEscapes(greedyAssignments, input.components) === 0
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

  let preferredAssignments = hasLowerBreakoutPointAssignmentCost(
    globallyConstructedAssignments,
    completedGreedyAssignments,
    scoringContext,
  )
    ? globallyConstructedAssignments
    : completedGreedyAssignments
  const alternateAssignments =
    preferredAssignments === globallyConstructedAssignments
      ? completedGreedyAssignments
      : globallyConstructedAssignments

  if (hasUnresolvedBreakoutTopology(preferredAssignments, input)) {
    improveBreakoutPointAssignments(preferredAssignments, scoringContext)
  }
  if (hasUnresolvedBreakoutTopology(preferredAssignments, input)) {
    improveBreakoutPointAssignments(alternateAssignments, scoringContext)
    if (
      hasLowerBreakoutPointAssignmentCost(
        alternateAssignments,
        preferredAssignments,
        scoringContext,
      )
    ) {
      preferredAssignments = alternateAssignments
    }
  }
  if (hasUnresolvedBreakoutTopology(preferredAssignments, input)) {
    const beamAssignments = solveBreakoutPointAssignmentBeam(
      breakoutPointRequests,
      scoringContext,
    )
    if (
      hasLowerBreakoutPointAssignmentCost(
        beamAssignments,
        preferredAssignments,
        scoringContext,
      )
    ) {
      preferredAssignments = beamAssignments
    }
  }

  return getBoundaryPointsFromAssignments(preferredAssignments)
}
