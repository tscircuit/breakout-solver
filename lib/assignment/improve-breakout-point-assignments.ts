import type { Point } from "@tscircuit/math-utils"
import { candidateHasRequiredSpacing } from "./breakout-point-assignment-spacing"
import { getBreakoutBoundaryCandidates } from "./get-breakout-boundary-candidates"
import {
  getBreakoutPointAssignmentCost,
  getTwoBreakoutPointAssignmentCost,
  type BreakoutPointAssignment,
  type BreakoutPointAssignmentScoringContext,
} from "./get-breakout-point-assignment-cost"

const MINIMUM_SCORE_IMPROVEMENT = 1e-6

interface BreakoutPointRelocation {
  kind: "relocation"
  assignmentIndex: number
  boundaryPoint: Point
  scoreChange: number
}

interface BreakoutPointSwap {
  kind: "swap"
  firstAssignmentIndex: number
  secondAssignmentIndex: number
  scoreChange: number
}

type BreakoutPointAssignmentChange = BreakoutPointRelocation | BreakoutPointSwap

const chooseLowerCostAssignmentChange = (
  first: BreakoutPointAssignmentChange | undefined,
  second: BreakoutPointAssignmentChange | undefined,
) => {
  if (!first) return second
  if (!second) return first
  return first.scoreChange <= second.scoreChange ? first : second
}

const getLowestCostRelocation = (
  assignments: BreakoutPointAssignment[],
  scoringContext: BreakoutPointAssignmentScoringContext,
) => {
  const { input } = scoringContext
  const boundaryPointSpacing = input.boundaryPointSpacing ?? 0
  let bestRelocation: BreakoutPointRelocation | undefined

  for (
    let assignmentIndex = 0;
    assignmentIndex < assignments.length;
    assignmentIndex++
  ) {
    const assignment = assignments[assignmentIndex]!
    const currentAssignmentCost = getBreakoutPointAssignmentCost(
      {
        assignment,
        assignments,
        ignoredAssignmentIndex: assignmentIndex,
      },
      scoringContext,
    )
    const candidates = getBreakoutBoundaryCandidates({
      insidePort: assignment.request.insidePort,
      outsidePorts: assignment.request.outsidePorts,
      bounds: input.bounds,
      boundaryPointSpacing,
    })
    const otherBoundaryPoints = assignments.flatMap(
      (existingAssignment, existingAssignmentIndex) =>
        existingAssignmentIndex === assignmentIndex
          ? []
          : [existingAssignment.boundaryPoint],
    )

    for (const boundaryPoint of candidates) {
      if (
        !candidateHasRequiredSpacing({
          candidate: boundaryPoint,
          assignedBoundaryPoints: otherBoundaryPoints,
          usedBoundaryPoints: input.usedBoundaryPoints ?? [],
          boundaryPointSpacing,
        })
      ) {
        continue
      }

      const candidateAssignment = {
        request: assignment.request,
        boundaryPoint,
      }
      const candidateAssignmentCost = getBreakoutPointAssignmentCost(
        {
          assignment: candidateAssignment,
          assignments,
          ignoredAssignmentIndex: assignmentIndex,
        },
        scoringContext,
      )
      const scoreChange = candidateAssignmentCost - currentAssignmentCost
      if (
        scoreChange < -MINIMUM_SCORE_IMPROVEMENT &&
        (!bestRelocation || scoreChange < bestRelocation.scoreChange)
      ) {
        bestRelocation = {
          kind: "relocation",
          assignmentIndex,
          boundaryPoint,
          scoreChange,
        }
      }
    }
  }

  return bestRelocation
}

const getLowestCostSwap = (
  assignments: BreakoutPointAssignment[],
  scoringContext: BreakoutPointAssignmentScoringContext,
) => {
  let bestSwap: BreakoutPointSwap | undefined

  for (
    let firstAssignmentIndex = 0;
    firstAssignmentIndex < assignments.length;
    firstAssignmentIndex++
  ) {
    for (
      let secondAssignmentIndex = firstAssignmentIndex + 1;
      secondAssignmentIndex < assignments.length;
      secondAssignmentIndex++
    ) {
      const firstAssignment = assignments[firstAssignmentIndex]!
      const secondAssignment = assignments[secondAssignmentIndex]!
      const currentCost = getTwoBreakoutPointAssignmentCost(
        {
          firstAssignment,
          secondAssignment,
          assignments,
          firstAssignmentIndex,
          secondAssignmentIndex,
        },
        scoringContext,
      )
      const swappedCost = getTwoBreakoutPointAssignmentCost(
        {
          firstAssignment: {
            request: firstAssignment.request,
            boundaryPoint: secondAssignment.boundaryPoint,
          },
          secondAssignment: {
            request: secondAssignment.request,
            boundaryPoint: firstAssignment.boundaryPoint,
          },
          assignments,
          firstAssignmentIndex,
          secondAssignmentIndex,
        },
        scoringContext,
      )
      const scoreChange = swappedCost - currentCost
      if (
        scoreChange < -MINIMUM_SCORE_IMPROVEMENT &&
        (!bestSwap || scoreChange < bestSwap.scoreChange)
      ) {
        bestSwap = {
          kind: "swap",
          firstAssignmentIndex,
          secondAssignmentIndex,
          scoreChange,
        }
      }
    }
  }

  return bestSwap
}

const applyAssignmentChange = (
  assignments: BreakoutPointAssignment[],
  assignmentChange: BreakoutPointAssignmentChange,
) => {
  if (assignmentChange.kind === "relocation") {
    assignments[assignmentChange.assignmentIndex] = {
      request: assignments[assignmentChange.assignmentIndex]!.request,
      boundaryPoint: assignmentChange.boundaryPoint,
    }
    return
  }

  const firstBoundaryPoint =
    assignments[assignmentChange.firstAssignmentIndex]!.boundaryPoint
  assignments[assignmentChange.firstAssignmentIndex] = {
    request: assignments[assignmentChange.firstAssignmentIndex]!.request,
    boundaryPoint:
      assignments[assignmentChange.secondAssignmentIndex]!.boundaryPoint,
  }
  assignments[assignmentChange.secondAssignmentIndex] = {
    request: assignments[assignmentChange.secondAssignmentIndex]!.request,
    boundaryPoint: firstBoundaryPoint,
  }
}

export function improveBreakoutPointAssignments(
  assignments: BreakoutPointAssignment[],
  scoringContext: BreakoutPointAssignmentScoringContext,
) {
  const maxImprovementCount = Math.max(1, assignments.length * 4)

  for (
    let improvementCount = 0;
    improvementCount < maxImprovementCount;
    improvementCount++
  ) {
    const assignmentChange = chooseLowerCostAssignmentChange(
      getLowestCostRelocation(assignments, scoringContext),
      getLowestCostSwap(assignments, scoringContext),
    )
    if (!assignmentChange) return

    applyAssignmentChange(assignments, assignmentChange)
  }
}
