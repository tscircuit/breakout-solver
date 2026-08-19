import { distance, type Bounds, type Point } from "@tscircuit/math-utils"
import type { BreakoutPort } from "../types"
import { getBreakoutBoundaryIntersection } from "../boundary/get-breakout-boundary-intersection"

const COORDINATE_KEY_PRECISION = 9

const getCandidateSearchStep = ({
  bounds,
  boundaryPointSpacing,
}: {
  bounds: Bounds
  boundaryPointSpacing: number
}) => {
  if (boundaryPointSpacing > 0) return boundaryPointSpacing
  return Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 40
}

const getPointKey = (point: Point) =>
  `${point.x.toFixed(COORDINATE_KEY_PRECISION)}:${point.y.toFixed(COORDINATE_KEY_PRECISION)}`

const getPerimeterGridCandidates = ({
  bounds,
  step,
}: {
  bounds: Bounds
  step: number
}) => {
  const perimeterGridCandidates: Point[] = []

  for (let x = bounds.minX; x <= bounds.maxX + step / 2; x += step) {
    const boundedX = Math.min(x, bounds.maxX)
    perimeterGridCandidates.push({ x: boundedX, y: bounds.minY })
    perimeterGridCandidates.push({ x: boundedX, y: bounds.maxY })
  }

  for (let y = bounds.minY; y <= bounds.maxY + step / 2; y += step) {
    const boundedY = Math.min(y, bounds.maxY)
    perimeterGridCandidates.push({ x: bounds.minX, y: boundedY })
    perimeterGridCandidates.push({ x: bounds.maxX, y: boundedY })
  }

  return perimeterGridCandidates
}

/**
 * Returns board-world boundary points in millimeters. +X is right and +Y is
 * top. Orthogonal projections keep a short local escape available while
 * target projections preserve downstream component guidance.
 */
export function getBreakoutBoundaryCandidates({
  insidePort,
  outsidePorts,
  bounds,
  boundaryPointSpacing,
}: {
  insidePort: BreakoutPort
  outsidePorts: BreakoutPort[]
  bounds: Bounds
  boundaryPointSpacing: number
}) {
  const candidatesByPointKey = new Map<string, Point>()
  const addCandidate = (candidate: Point | null) => {
    if (!candidate) return
    candidatesByPointKey.set(getPointKey(candidate), candidate)
  }

  for (const outsidePort of outsidePorts) {
    addCandidate(
      getBreakoutBoundaryIntersection({
        from: insidePort.position,
        to: outsidePort.position,
        bounds,
      }),
    )
  }

  addCandidate({ x: insidePort.position.x, y: bounds.minY })
  addCandidate({ x: insidePort.position.x, y: bounds.maxY })
  addCandidate({ x: bounds.minX, y: insidePort.position.y })
  addCandidate({ x: bounds.maxX, y: insidePort.position.y })

  const step = getCandidateSearchStep({ bounds, boundaryPointSpacing })
  if (step > 0) {
    for (const candidate of getPerimeterGridCandidates({ bounds, step })) {
      addCandidate(candidate)
    }
  }

  return [...candidatesByPointKey.values()].toSorted((first, second) => {
    const firstLocalEscapeLength = distance(insidePort.position, first)
    const secondLocalEscapeLength = distance(insidePort.position, second)
    if (firstLocalEscapeLength !== secondLocalEscapeLength) {
      return firstLocalEscapeLength - secondLocalEscapeLength
    }
    if (first.x !== second.x) return first.x - second.x
    return first.y - second.y
  })
}
