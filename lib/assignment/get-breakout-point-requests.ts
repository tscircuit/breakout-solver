import type { BreakoutPort, BreakoutTrace } from "../types"

export type InsidePortKey = string & { readonly __brand: "InsidePortKey" }

export interface BreakoutPointRequest {
  insidePortKey: InsidePortKey
  insidePort: BreakoutPort
  outsidePorts: BreakoutPort[]
}

export const getInsidePortKey = (insidePort: BreakoutPort) =>
  `${insidePort.sourcePortId}:${insidePort.layer ?? "top"}` as InsidePortKey

export function getBreakoutPointRequests(traces: BreakoutTrace[]) {
  const breakoutPointRequestsByInsidePortKey = new Map<
    InsidePortKey,
    BreakoutPointRequest
  >()

  for (const trace of traces) {
    for (const insidePort of trace.insidePorts) {
      const insidePortKey = getInsidePortKey(insidePort)
      const existingRequest =
        breakoutPointRequestsByInsidePortKey.get(insidePortKey)
      if (existingRequest) {
        existingRequest.outsidePorts.push(...trace.outsidePorts)
        continue
      }

      breakoutPointRequestsByInsidePortKey.set(insidePortKey, {
        insidePortKey,
        insidePort,
        outsidePorts: [...trace.outsidePorts],
      })
    }
  }

  return [...breakoutPointRequestsByInsidePortKey.values()]
}
