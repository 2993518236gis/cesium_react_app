import * as Cesium from 'cesium'

export type ShapeType = 'point' | 'polyline' | 'polygon'

export interface StoredShape {
  type: ShapeType
  // 经纬度坐标 [lng, lat, height][]
  coordinates: [number, number, number][]
}

const LS_KEY = 'cesium-draw-shapes'

export function loadShapes(): StoredShape[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveShapes(shapes: StoredShape[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(shapes))
}

export function cartesian3ToCoord(pos: Cesium.Cartesian3): [number, number, number] {
  const carto = Cesium.Cartographic.fromCartesian(pos)
  return [
    Cesium.Math.toDegrees(carto.longitude),
    Cesium.Math.toDegrees(carto.latitude),
    carto.height,
  ]
}

export function coordToCartesian3(coord: [number, number, number]): Cesium.Cartesian3 {
  return Cesium.Cartesian3.fromDegrees(coord[0], coord[1], coord[2])
}
