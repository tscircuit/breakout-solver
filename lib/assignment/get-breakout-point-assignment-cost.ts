import {
  distance,
  doSegmentsIntersect,
  type Point,
} from "@tscircuit/math-utils"
import {
  doesBreakoutSegmentIntersectNonIgnoredPads,
  doesBreakoutSegmentIntersectPads,
} from "../pad/breakout-pad-collisions"
import type { BreakoutPointSolverInput } from "../types"
import type { BreakoutPointRequest } from "./get-breakout-point-requests"

export interface BreakoutPointAssignment {
  request: BreakoutPointRequest
  boundaryPoint: Point
}

type AssignmentGuideCostKey = string & {
  readonly __brand: "AssignmentGuideCostKey"
}

const TARGET_GUIDE_WINDING_WEIGHT = 1_000
const PHYSICAL_OBSTACLE_GUIDE_WEIGHT = 0.01

export interface BreakoutPointAssignmentScoringContext {
  input: BreakoutPointSolverInput
  insideWindingPenalty: number
  targetGuideWindingPenalty: number
  obstacleCrossingPenalty: number
  guideCostsByAssignmentKey: Map<AssignmentGuideCostKey, number>
}

const pointsAreEqual = (first: Point, second: Point) =>
  Math.abs(first.x - second.x) <= 1e-9 && Math.abs(first.y - second.y) <= 1e-9

const segmentsCrossWithoutSharedEndpoint = (
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
) => {
  if (
    pointsAreEqual(firstStart, secondStart) ||
    pointsAreEqual(firstStart, secondEnd) ||
    pointsAreEqual(firstEnd, secondStart) ||
    pointsAreEqual(firstEnd, secondEnd)
  ) {
    return false
  }

  return doSegmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)
}

export function getBreakoutPointGuideCost({
  request,
  boundaryPoint,
  pads,
  obstacleCrossingPenalty,
}: {
  request: BreakoutPointRequest
  boundaryPoint: Point
  pads: BreakoutPointSolverInput["pads"]
  obstacleCrossingPenalty: number
}) {
  const inputPads = pads ?? []
  let guideCost = distance(request.insidePort.position, boundaryPoint)

  if (
    doesBreakoutSegmentIntersectPads({
      from: request.insidePort.position,
      to: boundaryPoint,
      pads: inputPads,
      sourcePortId: request.insidePort.sourcePortId,
      layer: request.insidePort.layer,
    })
  ) {
    guideCost += obstacleCrossingPenalty
  }

  for (const outsidePort of request.outsidePorts) {
    guideCost += distance(boundaryPoint, outsidePort.position)
    if (
      doesBreakoutSegmentIntersectNonIgnoredPads({
        from: boundaryPoint,
        to: outsidePort.position,
        pads: inputPads,
        ignoredSourcePortIds: [
          request.insidePort.sourcePortId,
          outsidePort.sourcePortId,
        ],
        layer: request.insidePort.layer,
      })
    ) {
      guideCost += obstacleCrossingPenalty
    }
  }

  return guideCost
}

export function getBreakoutPointAssignmentWindingCounts(
  first: BreakoutPointAssignment,
  second: BreakoutPointAssignment,
) {
  if (first.request.insidePort.layer !== second.request.insidePort.layer) {
    return { insideWindingCount: 0, targetGuideWindingCount: 0 }
  }

  const insideWindingCount = Number(
    segmentsCrossWithoutSharedEndpoint(
      first.request.insidePort.position,
      first.boundaryPoint,
      second.request.insidePort.position,
      second.boundaryPoint,
    ),
  )
  let targetGuideWindingCount = 0

  for (const firstOutsidePort of first.request.outsidePorts) {
    for (const secondOutsidePort of second.request.outsidePorts) {
      targetGuideWindingCount += Number(
        segmentsCrossWithoutSharedEndpoint(
          first.boundaryPoint,
          firstOutsidePort.position,
          second.boundaryPoint,
          secondOutsidePort.position,
        ),
      )
    }
  }

  return { insideWindingCount, targetGuideWindingCount }
}

export function countBreakoutPointAssignmentWindings(
  first: BreakoutPointAssignment,
  second: BreakoutPointAssignment,
) {
  const { insideWindingCount, targetGuideWindingCount } =
    getBreakoutPointAssignmentWindingCounts(first, second)
  return insideWindingCount + targetGuideWindingCount
}

export function countBreakoutPointWindings(
  assignments: BreakoutPointAssignment[],
) {
  let windingCount = 0
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
      windingCount += countBreakoutPointAssignmentWindings(
        assignments[firstAssignmentIndex]!,
        assignments[secondAssignmentIndex]!,
      )
    }
  }
  return windingCount
}

export function countBreakoutPointInsideWindings(
  assignments: BreakoutPointAssignment[],
) {
  let insideWindingCount = 0
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
      insideWindingCount += getBreakoutPointAssignmentWindingCounts(
        assignments[firstAssignmentIndex]!,
        assignments[secondAssignmentIndex]!,
      ).insideWindingCount
    }
  }
  return insideWindingCount
}

export function createBreakoutPointAssignmentScoringContext(
  input: BreakoutPointSolverInput,
): BreakoutPointAssignmentScoringContext {
  const boundsPerimeter =
    2 *
    (input.bounds.maxX -
      input.bounds.minX +
      input.bounds.maxY -
      input.bounds.minY)
  const outsidePortCount = input.traces.reduce(
    (count, trace) => count + trace.outsidePorts.length,
    0,
  )
  const targetGuideWindingPenalty =
    boundsPerimeter * TARGET_GUIDE_WINDING_WEIGHT
  // One inside winding can force the physical fanout onto another layer, so it
  // must cost more than every possible target-guide winding combined.
  const maximumTargetGuideWindingCount = outsidePortCount ** 2

  return {
    input,
    insideWindingPenalty:
      targetGuideWindingPenalty * (maximumTargetGuideWindingCount + 1),
    targetGuideWindingPenalty,
    obstacleCrossingPenalty: boundsPerimeter * PHYSICAL_OBSTACLE_GUIDE_WEIGHT,
    guideCostsByAssignmentKey: new Map<AssignmentGuideCostKey, number>(),
  }
}

const getBreakoutPointAssignmentWindingCost = (
  first: BreakoutPointAssignment,
  second: BreakoutPointAssignment,
  scoringContext: BreakoutPointAssignmentScoringContext,
) => {
  const { insideWindingCount, targetGuideWindingCount } =
    getBreakoutPointAssignmentWindingCounts(first, second)
  return (
    insideWindingCount * scoringContext.insideWindingPenalty +
    targetGuideWindingCount * scoringContext.targetGuideWindingPenalty
  )
}

const getAssignmentGuideCostKey = (assignment: BreakoutPointAssignment) =>
  `${assignment.request.insidePortKey}:${assignment.boundaryPoint.x}:${assignment.boundaryPoint.y}` as AssignmentGuideCostKey

const getCachedAssignmentGuideCost = (
  assignment: BreakoutPointAssignment,
  scoringContext: BreakoutPointAssignmentScoringContext,
) => {
  const assignmentGuideCostKey = getAssignmentGuideCostKey(assignment)
  const cachedGuideCost = scoringContext.guideCostsByAssignmentKey.get(
    assignmentGuideCostKey,
  )
  if (cachedGuideCost !== undefined) return cachedGuideCost

  const guideCost = getBreakoutPointGuideCost({
    request: assignment.request,
    boundaryPoint: assignment.boundaryPoint,
    pads: scoringContext.input.pads,
    obstacleCrossingPenalty: scoringContext.obstacleCrossingPenalty,
  })
  scoringContext.guideCostsByAssignmentKey.set(
    assignmentGuideCostKey,
    guideCost,
  )
  return guideCost
}

export function getBreakoutPointAssignmentCost(
  {
    assignment,
    assignments,
    ignoredAssignmentIndex,
  }: {
    assignment: BreakoutPointAssignment
    assignments: BreakoutPointAssignment[]
    ignoredAssignmentIndex?: number
  },
  scoringContext: BreakoutPointAssignmentScoringContext,
) {
  const windingCost = assignments.reduce(
    (cost, existingAssignment, existingAssignmentIndex) =>
      existingAssignmentIndex === ignoredAssignmentIndex
        ? cost
        : cost +
          getBreakoutPointAssignmentWindingCost(
            existingAssignment,
            assignment,
            scoringContext,
          ),
    0,
  )

  return getCachedAssignmentGuideCost(assignment, scoringContext) + windingCost
}

export function getTwoBreakoutPointAssignmentCost(
  {
    firstAssignment,
    secondAssignment,
    assignments,
    firstAssignmentIndex,
    secondAssignmentIndex,
  }: {
    firstAssignment: BreakoutPointAssignment
    secondAssignment: BreakoutPointAssignment
    assignments: BreakoutPointAssignment[]
    firstAssignmentIndex: number
    secondAssignmentIndex: number
  },
  scoringContext: BreakoutPointAssignmentScoringContext,
) {
  let score = getCachedAssignmentGuideCost(firstAssignment, scoringContext)
  score += getCachedAssignmentGuideCost(secondAssignment, scoringContext)
  score += getBreakoutPointAssignmentWindingCost(
    firstAssignment,
    secondAssignment,
    scoringContext,
  )

  for (
    let existingAssignmentIndex = 0;
    existingAssignmentIndex < assignments.length;
    existingAssignmentIndex++
  ) {
    if (
      existingAssignmentIndex === firstAssignmentIndex ||
      existingAssignmentIndex === secondAssignmentIndex
    ) {
      continue
    }
    const existingAssignment = assignments[existingAssignmentIndex]!
    score += getBreakoutPointAssignmentWindingCost(
      existingAssignment,
      firstAssignment,
      scoringContext,
    )
    score += getBreakoutPointAssignmentWindingCost(
      existingAssignment,
      secondAssignment,
      scoringContext,
    )
  }

  return score
}
