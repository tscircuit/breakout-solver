import type { Point } from "@tscircuit/math-utils"
import { candidateHasRequiredSpacing } from "./breakout-point-assignment-spacing"
import { getBreakoutBoundaryCandidates } from "./get-breakout-boundary-candidates"
import {
  getBreakoutPointAssignmentWindingCounts,
  getBreakoutPointGuideCost,
  type BreakoutPointAssignment,
  type BreakoutPointAssignmentScoringContext,
} from "./get-breakout-point-assignment-cost"
import type { BreakoutPointRequest } from "./get-breakout-point-requests"

const MAX_ASSIGNMENT_BEAM_WIDTH = 256

interface BreakoutPointCandidate {
  boundaryPoint: Point
  guideCost: number
}

interface BreakoutPointAssignmentBeamState {
  assignments: BreakoutPointAssignment[]
  insideWindingCount: number
  targetGuideWindingCount: number
  guideCost: number
}

const getRequestCandidates = (
  request: BreakoutPointRequest,
  scoringContext: BreakoutPointAssignmentScoringContext,
) => {
  const { input } = scoringContext
  return getBreakoutBoundaryCandidates({
    insidePort: request.insidePort,
    outsidePorts: request.outsidePorts,
    bounds: input.bounds,
    boundaryPointSpacing: input.boundaryPointSpacing ?? 0,
  }).map(
    (boundaryPoint): BreakoutPointCandidate => ({
      boundaryPoint,
      guideCost: getBreakoutPointGuideCost({
        request,
        boundaryPoint,
        pads: input.pads,
        components: input.components,
        insideEscapeDirectionPenalty:
          scoringContext.insideEscapeDirectionPenalty,
        padCrossingGuidePenalty: scoringContext.padCrossingGuidePenalty,
      }),
    }),
  )
}

const getBeamStateScore = (
  state: BreakoutPointAssignmentBeamState,
  scoringContext: BreakoutPointAssignmentScoringContext,
) =>
  state.insideWindingCount * scoringContext.insideWindingPenalty +
  state.targetGuideWindingCount * scoringContext.targetGuideWindingPenalty +
  state.guideCost

export function solveBreakoutPointAssignmentBeam(
  breakoutPointRequests: BreakoutPointRequest[],
  scoringContext: BreakoutPointAssignmentScoringContext,
) {
  const { input } = scoringContext
  const boundaryPointSpacing = input.boundaryPointSpacing ?? 0
  let beam: BreakoutPointAssignmentBeamState[] = [
    {
      assignments: [],
      insideWindingCount: 0,
      targetGuideWindingCount: 0,
      guideCost: 0,
    },
  ]

  for (const request of breakoutPointRequests) {
    const candidates = getRequestCandidates(request, scoringContext)
    const nextBeam: BreakoutPointAssignmentBeamState[] = []

    for (const state of beam) {
      const assignedBoundaryPoints = state.assignments.map(
        (assignment) => assignment.boundaryPoint,
      )
      for (const candidate of candidates) {
        if (
          !candidateHasRequiredSpacing({
            candidate: candidate.boundaryPoint,
            assignedBoundaryPoints,
            usedBoundaryPoints: input.usedBoundaryPoints ?? [],
            boundaryPointSpacing,
          })
        ) {
          continue
        }

        const assignment = {
          request,
          boundaryPoint: candidate.boundaryPoint,
        }
        let additionalInsideWindingCount = 0
        let additionalTargetGuideWindingCount = 0
        for (const existingAssignment of state.assignments) {
          const windingCounts = getBreakoutPointAssignmentWindingCounts(
            existingAssignment,
            assignment,
          )
          additionalInsideWindingCount += windingCounts.insideWindingCount
          additionalTargetGuideWindingCount +=
            windingCounts.targetGuideWindingCount
        }
        nextBeam.push({
          assignments: [...state.assignments, assignment],
          insideWindingCount:
            state.insideWindingCount + additionalInsideWindingCount,
          targetGuideWindingCount:
            state.targetGuideWindingCount + additionalTargetGuideWindingCount,
          guideCost: state.guideCost + candidate.guideCost,
        })
      }
    }

    if (nextBeam.length === 0) {
      throw new Error(
        `BreakoutPointSolver: no complete boundary assignment satisfies the required ${boundaryPointSpacing}mm spacing`,
      )
    }
    beam = nextBeam
      .toSorted(
        (first, second) =>
          getBeamStateScore(first, scoringContext) -
          getBeamStateScore(second, scoringContext),
      )
      .slice(0, MAX_ASSIGNMENT_BEAM_WIDTH)
  }

  return beam[0]!.assignments
}
