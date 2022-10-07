import { OrbitControls, useCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import { Vector3 } from "three";

const hexValues = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];

function randHex() {
    let hex = '#';
  
    for(let i = 0; i < 6; i++){
      const index = Math.floor(Math.random() * hexValues.length)
      hex += hexValues[index];
    }
    return hex;
}

function StackItem({height: h, direction}) {
    const ref = useRef(null);
    const color = useRef(randHex());
    const speed = 0.04
    useEffect(() => {
        console.log(ref);
        if(direction === 1) {
            ref.current.position.x = 3
            ref.current.position.z = 0
        }
        else {
            ref.current.position.z = 3
            ref.current.position.x = 0
        }
    }, [])
    useFrame(() => {
        ref.current.position.x = ref.current.position.x > 0 ? ref.current.position.x -= speed : 0;
        ref.current.position.z = ref.current.position.z > 0 ? ref.current.position.z -= speed : 0;
    })
    return (
      <mesh position={[100, h, 100]} ref={ref}>
        <boxGeometry args={[1, 0.2, 1]} />
        <meshLambertMaterial color={color.current} />
      </mesh>
    );
}

const MemoizedStackItem = React.memo(StackItem);

function Stacks() {

    const direction = useRef(0); // 스택이 날아오는 방향 0, 1 두가지임

    const camera = useThree(state => state.camera);
    const isCameraMoving = useRef(false);

    const stackHeight = useRef(0.2); // 스택이 쌓이는 높이 
    const [stacks, setStacks] = useState([]) // 스택 높이 어레이

    useFrame(() => {
        if(isCameraMoving.current) { // 카메라가 움직일 때 프레임 마다 카메라 높이 증가
            if(camera.position.y < stackHeight.current + 2) {
                camera.position.y += 0.02
            }
            else {
                camera.position.y = stackHeight.current + 2;
                isCameraMoving.current = false;
            }
            camera.updateProjectionMatrix()
        }
    })
    
    const onKeyDown = ({key}) => {
        if(key === ' ') { // 'k' 누를 시 새로운 스택 생성 : 테스트용
            setStacks([
                ...stacks,
                stackHeight.current
            ])
            onMoveCamera();
            stackHeight.current += 0.2
            direction.current = direction.current === 0 ? 1 : 0
        }
        else if(key === 'k') {

        }
    };
    const onMoveCamera = () => {
        if(!camera) return;
        isCameraMoving.current = true;
        //console.log(camera);
        //camera.position.set(-3, stackHeight.current + 2, -3);
        //camera.lookAt(new Vector3(0, stackHeight.current, 0))
    }

    useEffect(() => {
        camera.lookAt(new Vector3(0, stackHeight.current, 0))
    }, [])

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        }
    }, [stacks])

    return (
      <>
        <mesh position={[0, 0, 0]} >
          <boxGeometry args={[1, 0.2, 1]} />
          <meshLambertMaterial color={'#343434'} />
        </mesh>
        {stacks.map((h, i) => (
          <MemoizedStackItem height={h} key={i} direction={direction.current} />
        ))}
      </>
    );
}

function Stack() {
    
    
  return (
    <Canvas
      camera={{
        position: [-3, 2.2, -3],
        fov: 75,
        // lookAt: [0, 0.2, 0]
      }}
    >
      
      {/* <OrbitControls /> */}
      <directionalLight position={[-3, 255, -3]}>
        <orthographicCamera
          attach="shadow-camera"
          left={-20}
          right={20}
          top={20}
          bottom={-20}
        />
      </directionalLight>
      <ambientLight intensity={0.4} />
      <Stacks />
    </Canvas>
  );
}

export default Stack;
