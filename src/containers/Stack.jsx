import { OrbitControls, useCamera, MeshReflectorMaterial, Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";

const hexValues = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

/*
  랜덤 색깔 추출 함수
*/
function randHex() {
  let hex = "#";

  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * hexValues.length);
    hex += hexValues[index];
  }
  return hex;
}

/*
  이전 스택과 현재 스택이 만나면
  현재 스택이 두 블럭으로 분리되는데
  이때 분리되는 블럭의 좌표와 크기를 계산하는 함수
*/
const getDetached = ({
  prevCoords,
  curCoords,
  curXLength,
  curZLength,
  prevXLength,
  prevZLength,
  dir,
}) => {
  const diff =
    dir === 0
      ? Math.abs(curCoords.z - prevCoords.z)
      : Math.abs(curCoords.x - prevCoords.x);

  let isOnPreviousStack = true // 현재 블럭이 이전 블럭 위에 걸쳐져 있는지?

  if(dir === 1) { // x축 기준
    const curStackEdgeXCoordNearCenter = curCoords.x - curXLength / 2 // 원점으로 부터 가장 가까운 현재 스택의 모서리 좌표
    const prevStackEdgeXCoordFarCenter = prevCoords.x + curXLength / 2 // 원점으로부터 가장 먼 이전 스택의 모서리 좌표
    const diff = curStackEdgeXCoordNearCenter - prevStackEdgeXCoordFarCenter; // 이 둘을 뺌으로써 현재 블럭과 이전 블럭이 겹쳐있는 지 여부를 체크할 수 있다.
    isOnPreviousStack = diff <= 0
  }
  else { // z축 기준
    const curStackEdgeZCoordNearCenter = curCoords.z - curZLength / 2 
    const prevStackEdgeZCoordFarCenter = prevCoords.z + curZLength / 2
    const diff = curStackEdgeZCoordNearCenter - prevStackEdgeZCoordFarCenter;
    isOnPreviousStack = diff <= 0
  }
  //console.log(isOnPreviousStack);
  return {
    isOnPreviousStack,
    remainShape: [
      dir === 1 ? curXLength - diff : curXLength,
      0.2,
      dir === 0 ? curZLength - diff : curZLength,
    ],
    remainLoc: [
      prevCoords.x < curCoords.x ? 
      (prevCoords.x + prevXLength / 2 + (curCoords.x - curXLength / 2)) / 2 :
      (prevCoords.x - prevXLength / 2 + (curCoords.x + curXLength / 2)) / 2,
      curCoords.y,
      prevCoords.z < curCoords.z ?
      (prevCoords.z + prevZLength / 2 + (curCoords.z - curZLength / 2)) / 2 :
      (prevCoords.z - prevZLength / 2 + (curCoords.z + curZLength / 2)) / 2,
    ],
    fallingShape: [
      dir === 1 ? diff : curXLength,
      0.2,
      dir === 0 ? diff : curZLength,
    ],
    fallingLoc: [
      prevCoords.x < curCoords.x ?
      (prevCoords.x + prevXLength / 2 + (curCoords.x + curXLength / 2)) / 2 :
      (prevCoords.x - prevXLength / 2 + (curCoords.x - curXLength / 2)) / 2,
      curCoords.y,
      prevCoords.z < curCoords.z ?
      (prevCoords.z + prevZLength / 2 + (curCoords.z + curZLength / 2)) / 2 :
      (prevCoords.z - prevZLength / 2 + (curCoords.z - curZLength / 2)) / 2,
    ],
  };
};

const StackItem = React.forwardRef(
  ({ direction, position, shape = [1, 0.2, 1], detachedPosition, detachedShape }, ref) => {
    const color = useRef(randHex());
    const fallingMeshRef = useRef(null);
    const velocity = useRef(0);
    useEffect(() => {
      if (!ref.current) return;
      // console.log(ref.current);
      if (direction === 1) {
        ref.current.position.x = position[0] + 3;
        ref.current.position.z = position[2];
      } else {
        ref.current.position.z = position[2] + 3;
        ref.current.position.x = position[0];
      }
      ref.current.visible = true;
    }, []);


    useFrame(() => { // 중력
      if(!fallingMeshRef.current) return;
      if(fallingMeshRef.current.position.y > -50) {
        velocity.current = velocity.current + 0.0005
      fallingMeshRef.current.position.y -= velocity.current
      } 
      else if(fallingMeshRef.current.visible) {
        fallingMeshRef.current.visible = false;
      }
    })

    //console.log(detachedPosition, detachedShape)

    return (
      <>
        {detachedPosition && detachedShape && (
          <mesh position={detachedPosition} ref={fallingMeshRef}>
            <boxGeometry args={detachedShape} />
            <meshLambertMaterial color={color.current} />
          </mesh>
        )}
        <mesh position={position} ref={ref} visible={false}>
          <boxGeometry args={shape} />
          <meshLambertMaterial color={color.current} />
        </mesh>
      </>
    );
  }
);

const MemoizedStackItem = React.memo(StackItem);

function Stacks() {
  const speed = 0.04;

  const camera = useThree((state) => state.camera);

  const isStarting = useRef(false);
  const isCameraMoving = useRef(false);

  const baseStackRef = useRef();
  const latestStackRef = useRef();
  const previousStackRef = useRef();

  const direction = useRef(0); // 스택이 날아오는 방향 0: z축 이동, 1: x축 이동 두가지임
  const stackHeight = useRef(0.2); // 스택이 쌓이는 높이

  const stackRef = useRef({
    shape: [1, 0.2, 1],
    position: [0, 0, 0],
    detachedShape: [0, 0, 0],
    detachedPosition: [0, 0, 0],
  });

  const [stacks, setStacks] = useState([]); // 스택 위치 어레이

  //console.log(stacks);

  useFrame(() => {
    if (isCameraMoving.current) {
      // 카메라가 움직일 때 프레임 마다 카메라 높이 증가
      if (camera.position.y < stackHeight.current + 2) {
        camera.position.y += 0.02;
      } else {
        camera.position.y = stackHeight.current + 2;
        isCameraMoving.current = false;
      }
      camera.updateProjectionMatrix();
    }
  });

  useFrame(() => {
    // 마지막 스택 아이템 프레임 마다 움직임
    if (!latestStackRef.current || !previousStackRef.current) return;
    //console.log('isMove?')
      if(direction.current === 1) {
        latestStackRef.current.position.x -= speed;
      }
      else latestStackRef.current.position.z -= speed;
  });

  const initialize = () => {

    previousStackRef.current = null;
    latestStackRef.current = null;
    latestStackRef.current = baseStackRef.current
    isStarting.current = false;
    direction.current = 0
    stackHeight.current = 0.2
    stackRef.current = {
      shape: [1, 0.2, 1],
      position: [0, 0, 0],
      detachedShape: [0, 0, 0],
      detachedPosition: [0, 0, 0],
    }
    camera.position.set(-2, 2.2, -2)
    camera.lookAt(new Vector3(0, stackHeight.current, 0)); // 카메라 위치 초기화

    //console.log('In Initialize Function:', previousStackRef, latestStackRef, baseStackRef)
    setStacks(() => [])
  }

  const setStarting = (start) => {
    isStarting.current = start;
  };

  function createNextStackItem() {
    // 다음 스택 블럭 소환
    let detachedPosition = null;
    let detachedShape = null;

    if (previousStackRef.current && latestStackRef.current) {
      // 이전 스택 블럭과 다음 스택 블럭을 통해 남은 스택 블럭 계산
      const detachedCoords = getDetached({
        prevCoords: previousStackRef.current.position,
        curCoords: latestStackRef.current.position,
        curXLength: latestStackRef.current.geometry.parameters.width,
        curZLength: latestStackRef.current.geometry.parameters.depth,
        prevXLength: previousStackRef.current.geometry.parameters.width,
        prevZLength: previousStackRef.current.geometry.parameters.depth,
        dir: direction.current,
      });

      const { remainLoc, remainShape, fallingLoc, fallingShape } = detachedCoords;

      stackRef.current.position = [remainLoc[0], stackHeight.current, remainLoc[2]];
      stackRef.current.shape = remainShape
      //stackRef.current.detachedPosition = fallingLoc;
      //stackRef.current.detachedShape = fallingShape;
      detachedPosition = fallingLoc;
      detachedShape = fallingShape;
    } else {
      stackRef.current.position = [0, stackHeight.current, 0]  // 다음 스택 위치 업데이트
    }

    previousStackRef.current = latestStackRef.current // 현재 ref를 이전 ref로 넘김
    
    if(stacks.length >= 1) {

      const len = stacks.length
      const prev = {...stacks[len - 1]};
      
      prev.shape = stackRef.current.shape
      prev.position = [stackRef.current.position[0], prev.position[1], stackRef.current.position[2]]
      prev.detachedPosition = detachedPosition
      prev.detachedShape = detachedShape

      setStacks((v) => [
        ...v.slice(0, -1),
        {...prev},
        {...stackRef.current}
      ]);
    }
    else {
      setStacks((v) => [
        {...stackRef.current}
      ]); 
    } // 스택 어레이 업데이트

    onMoveCamera(); // 카메라 이동
    stackHeight.current += 0.2; // 다음 스택 높이 업데이트
    direction.current = direction.current === 0 ? 1 : 0; // 다음 스택 방향 업데이트

    //console.log('In Next Stack Function:', previousStackRef, latestStackRef, baseStackRef)
  };

  const onKeyDown = ({ key }) => {
    if (key === " ") {
      setStarting(!isStarting.current);
      if (isStarting.current) createNextStackItem();
    } else if (key === "k") {
      // 'k' 누를 시 새로운 스택 생성 : 테스트용
      if (isStarting.current) createNextStackItem();
    } else if (key === 'r') {
      initialize();
    }
  };

  const onMoveCamera = () => {
    // 카메라 움직임 활성화 마지막 스택 블럭 위치까지 따라감
    if (!camera) return;
    isCameraMoving.current = true;
  };

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);

  useEffect(() => {
    // 처음 캔버스 렌더될 때 초기화 이펙트
    initialize()
  }, []);

  return (
    <>
      <mesh position={[0, 0, 0]} ref={baseStackRef}>
        <boxGeometry args={[1, 0.2, 1]} />
        <meshLambertMaterial color={"#343434"} />
      </mesh>
      {stacks.map((stack, i) => (
        <MemoizedStackItem
          position={stack.position}
          shape={stack.shape}
          key={i}
          direction={direction.current}
          detachedPosition={stack.detachedPosition}
          detachedShape={stack.detachedShape}
          ref={stacks.length - 1 === i ? latestStackRef : null}
        />
      ))}
    </>
  );
}

function Stack() {
  return (
    <Canvas
      camera={{
        position: [-2, 2.2, -2],
        fov: 75,
        // lookAt: [0, 0.2, 0]
      }}
      gl={{ alpha: false }}
      shadows
    >
      <fog attach="fog" args={["#17171b", 3, 10]} />
      <color attach="background" args={["#17171b"]} />
      <directionalLight castShadows position={[-3, 255, -3]} intensity={2}>
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
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ambientLight intensity={0.5} />
        <planeGeometry args={[50, 50]} />
        <MeshReflectorMaterial
            blur={[400, 100]}
            resolution={1024}
            mixBlur={1}
            mixStrength={15}
            depthScale={1}
            minDepthThreshold={0.85}
            color="#2e263d"
            metalness={0.6}
            roughness={1}
          />
      </mesh>
      <Environment preset="dawn" />
    </Canvas>
  );
}

export default Stack;
