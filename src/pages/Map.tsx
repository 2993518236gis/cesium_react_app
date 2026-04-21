import CesiumViewer from '../components/CesiumViewer'

const Map = () => {
  return (
    <div style={{  flex:1, overflow:'hidden',position:'relative',height:'100vh' }}>
      <CesiumViewer />
    </div>
  )
}

export default Map