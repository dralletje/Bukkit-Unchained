import React from "react";
import { Canvas, useFrame, useThree, useRender, useLoader, extend } from 'react-three-fiber'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

extend({ OrbitControls })
const Controls = props => {
  const { gl, camera } = useThree()
  const ref = React.useRef()
  useRender(() => ref.current.update())
  return <orbitControls ref={ref} args={[camera, gl.domElement]} {...props} />
}

function Thing({ ...props }) {
  const ref = React.useRef();
  // useFrame(() => (ref.current.rotation.x = ref.current.rotation.y += 0.01));

  return (
    <mesh
      ref={ref}
      onClick={e => console.log("click")}
      onPointerOver={e => console.log("hover")}
      onPointerOut={e => console.log("unhover")}
      {...props}
    >
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  );
}

export let RegionView = () => {
  return (
    // <Canvas>
    <Canvas camera={{ position: [0, 0, 5] }} shadowMap>
    <Thing position={[0, 0, 0]} />
    <Thing position={[1, 0, 0]} />
    <Thing position={[2, 0, 0]} />

      {/*<fog attach="fog" args={['#cc7b32', 16, 20]} />*/}

      <Controls
        // autoRotate
        enablePan={false}
        // enableZoom={false}
        enableDamping
        dampingFactor={0.5}
        rotateSpeed={1}
        // maxPolarAngle={Math.PI / 2}
        // minPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
};
