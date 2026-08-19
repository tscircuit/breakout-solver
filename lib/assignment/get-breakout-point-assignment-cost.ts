import {
  distance,
  doSegmentsIntersect,
  type Point,
} from "@tscircuit/math-utils"
import {
  doesBreakoutSegmentIntersectNonIgnoredPads,
  doesBreakoutSegmentIntersectPads,
} from "../pad/breakout-pad-collisions"
import { doesEscapeGuideReversePerimeterPadDirection } from "../component/does-escape-guide-reverse-perimeter-pad-direction"
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
const PAD_CROSSING_GUIDE_WEIGHT = 0.01

export interface BreakoutPointAssignmentScoringContext {
  input: BreakoutPointSolverInput
  insideWindingPenalty: number
  insideEscapeDirectionPenalty: number
  targetGuideWindingPenalty: number
  padCrossingGuidePenalty: number
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
  components,
  insideEscapeDirectionPenalty,
  padCrossingGuidePenalty,
}: {
  request: BreakoutPointRequest
  boundaryPoint: Point
  pads: BreakoutPointSolverInput["pads"]
  components: BreakoutPointSolverInput["components"]
  insideEscapeDirectionPenalty: number
  padCrossingGuidePenalty: number
}) {
  const inputPads = pads ?? []
  let guideCost = distance(request.insidePort.position, boundaryPoint)

  const insideGuideCrossesPad = doesBreakoutSegmentIntersectPads({
    from: request.insidePort.position,
    to: boundaryPoint,
    pads: inputPads,
    sourcePortId: request.insidePort.sourcePortId,
    layer: request.insidePort.layer,
  })
  const insideGuideReversesPerimeterPadDirection =
    doesEscapeGuideReversePerimeterPadDirection({
      insidePort: request.insidePort,
      boundaryPoint,
      components,
    })
  if (insideGuideCrossesPad) guideCost += padCrossingGuidePenalty
  if (insideGuideReversesPerimeterPadDirection)
    guideCost += insideEscapeDirectionPenalty

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
      guideCost += padCrossingGuidePenalty
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

export function countReversedPerimeterPadEscapes(
  assignments: BreakoutPointAssignment[],
  components: BreakoutPointSolverInput["components"],
) {
  return assignments.reduce(
    (count, assignment) =>
      count +
      Number(
        doesEscapeGuideReversePerimeterPadDirection({
          insidePort: assignment.request.insidePort,
          boundaryPoint: assignment.boundaryPoint,
          components,
        }),
      ),
    0,
  )
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
  const maximumTargetGuideWindingCount = outsidePortCount ** 2
  // Reversing an elongated perimeter lead points its escape behind the source
  // package. Prefer every outward-facing assignment before optimizing target
  // guides, while square BGA/header pads remain direction-neutral.
  const insideEscapeDirectionPenalty =
    targetGuideWindingPenalty * (maximumTargetGuideWindingCount + 1)
  const insidePortCount = input.traces.reduce(
    (count, trace) => count + trace.insidePorts.length,
    0,
  )
  // One inside winding can force physical fanout onto another layer, so it
  // must cost more than all escape-direction and target-guide penalties.
  const insideWindingPenalty =
    insideEscapeDirectionPenalty * (insidePortCount + 1)

  return {
    input,
    insideWindingPenalty,
    insideEscapeDirectionPenalty,
    targetGuideWindingPenalty,
    padCrossingGuidePenalty: boundsPerimeter * PAD_CROSSING_GUIDE_WEIGHT,
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

export function getBreakoutPointAssignmentsCost(
  assignments: BreakoutPointAssignment[],
  scoringContext: BreakoutPointAssignmentScoringContext,
) {
  let cost = 0
  for (
    let firstAssignmentIndex = 0;
    firstAssignmentIndex < assignments.length;
    firstAssignmentIndex++
  ) {
    const firstAssignment = assignments[firstAssignmentIndex]!
    cost += getCachedAssignmentGuideCost(firstAssignment, scoringContext)
    for (
      let secondAssignmentIndex = firstAssignmentIndex + 1;
      secondAssignmentIndex < assignments.length;
      secondAssignmentIndex++
    ) {
      cost += getBreakoutPointAssignmentWindingCost(
        firstAssignment,
        assignments[secondAssignmentIndex]!,
        scoringContext,
      )
    }
  }
  return cost
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
    components: scoringContext.input.components,
    insideEscapeDirectionPenalty: scoringContext.insideEscapeDirectionPenalty,
    padCrossingGuidePenalty: scoringContext.padCrossingGuidePenalty,
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
