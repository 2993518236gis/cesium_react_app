import fs from 'fs-extra'
import path from 'path'

const cesiumSource = path.join(
  'node_modules/cesium/Build/Cesium'
)
const cesiumDest = path.join('public/cesium')

fs.copySync(cesiumSource, cesiumDest)
console.log('Cesium assets copied!')