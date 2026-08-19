import type { Point } from "@tscircuit/math-utils"
import type { BreakoutComponent, BreakoutPort } from "../types"

const COMPONENT_EDGE_TOLERANCE = 1e-6
const MIN_DIRECTIONAL_PAD_ASPECT_RATIO = 1.5

const rotatePoint = (point: Point, radians: number): Point => ({
  x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
  y: point.x * Math.sin(radians) + point.y * Math.cos(radians),
})

const toComponentLocalPoint = (point: Point, component: BreakoutComponent) =>
  rotatePoint(
    {
      x: point.x - component.center.x,
      y: point.y - component.center.y,
    },
    (-(component.ccwRotationDegrees ?? 0) * Math.PI) / 180,
  )

const portTouchesComponentPerimeter = (
  insidePort: BreakoutPort,
  component: BreakoutComponent,
) => {
  const localPortPosition = toComponentLocalPoint(
    insidePort.position,
    component,
  )
  const halfComponentWidth = component.width / 2
  const halfComponentHeight = component.height / 2
  const halfPortWidth = (insidePort.width ?? 0) / 2
  const halfPortHeight = (insidePort.height ?? 0) / 2
  const isWithinComponentWidth =
    Math.abs(localPortPosition.x) <=
    halfComponentWidth + halfPortWidth + COMPONENT_EDGE_TOLERANCE
  const isWithinComponentHeight =
    Math.abs(localPortPosition.y) <=
    halfComponentHeight + halfPortHeight + COMPONENT_EDGE_TOLERANCE
  if (!isWithinComponentWidth || !isWithinComponentHeight) return false

  const touchesVerticalEdge =
    Math.abs(Math.abs(localPortPosition.x) - halfComponentWidth) <=
    halfPortWidth + COMPONENT_EDGE_TOLERANCE
  const touchesHorizontalEdge =
    Math.abs(Math.abs(localPortPosition.y) - halfComponentHeight) <=
    halfPortHeight + COMPONENT_EDGE_TOLERANCE
  return touchesVerticalEdge || touchesHorizontalEdge
}

const getPadLongAxis = (insidePort: BreakoutPort): Point | null => {
  const { width, height } = insidePort
  if (width === undefined || height === undefined) return null
  const shortDimension = Math.min(width, height)
  const longDimension = Math.max(width, height)
  if (
    shortDimension <= 0 ||
    longDimension / shortDimension < MIN_DIRECTIONAL_PAD_ASPECT_RATIO
  ) {
    return null
  }

  const rotationRadians = ((insidePort.ccwRotationDegrees ?? 0) * Math.PI) / 180
  return width >= height
    ? { x: Math.cos(rotationRadians), y: Math.sin(rotationRadians) }
    : { x: -Math.sin(rotationRadians), y: Math.cos(rotationRadians) }
}

/**
 * Detects an escape aimed behind an elongated perimeter lead. This describes
 * the winding class of QFP/QFN leads without constraining square BGA or header
 * pads, whose physical escape direction belongs to the fanout solver.
 */
export function doesEscapeGuideReversePerimeterPadDirection({
  insidePort,
  boundaryPoint,
  components,
}: {
  insidePort: BreakoutPort
  boundaryPoint: Point
  components?: BreakoutComponent[]
}) {
  const padLongAxis = getPadLongAxis(insidePort)
  if (!padLongAxis) return false

  const sourceComponent = (components ?? [])
    .filter(
      (component) =>
        (component.layer === undefined ||
          insidePort.layer === undefined ||
          component.layer === insidePort.layer) &&
        portTouchesComponentPerimeter(insidePort, component),
    )
    .toSorted(
      (first, second) =>
        first.width * first.height - second.width * second.height,
    )[0]
  if (!sourceComponent) return false

  const componentToPort = {
    x: insidePort.position.x - sourceComponent.center.x,
    y: insidePort.position.y - sourceComponent.center.y,
  }
  const longAxisTowardPort =
    componentToPort.x * padLongAxis.x + componentToPort.y * padLongAxis.y
  if (Math.abs(longAxisTowardPort) <= COMPONENT_EDGE_TOLERANCE) return false

  const outwardPadAxis =
    longAxisTowardPort > 0
      ? padLongAxis
      : { x: -padLongAxis.x, y: -padLongAxis.y }
  const escapeVector = {
    x: boundaryPoint.x - insidePort.position.x,
    y: boundaryPoint.y - insidePort.position.y,
  }
  return (
    escapeVector.x * outwardPadAxis.x + escapeVector.y * outwardPadAxis.y <
    -COMPONENT_EDGE_TOLERANCE
  )
}
