import { distance, type Point } from "@tscircuit/math-utils"

const BOUNDARY_POINT_DISTANCE_TOLERANCE = 1e-6

export function candidateHasRequiredSpacing({
  candidate,
  assignedBoundaryPoints,
  usedBoundaryPoints,
  boundaryPointSpacing,
}: {
  candidate: Point
  assignedBoundaryPoints: Point[]
  usedBoundaryPoints: Point[]
  boundaryPointSpacing: number
}) {
  const requiredDistance =
    boundaryPointSpacing - BOUNDARY_POINT_DISTANCE_TOLERANCE
  if (requiredDistance <= 0) return true

  return [...assignedBoundaryPoints, ...usedBoundaryPoints].every(
    (boundaryPoint) => distance(boundaryPoint, candidate) >= requiredDistance,
  )
}
