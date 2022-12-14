import {
  OrbitControls,
  useCamera,
  MeshReflectorMaterial,
  Environment,
  Text,
  Stars,
} from "@react-three/drei";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import { Physics, useBox, usePlane } from "@react-three/cannon";

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

  let isOnPreviousStack = true; // 현재 블럭이 이전 블럭 위에 걸쳐져 있는지?

  if (dir === 1) {
    // x축 기준
    const curStackEdgeXCoordNearCenter =
      prevCoords.x < curCoords.x
        ? curCoords.x - curXLength / 2
        : curCoords.x + curXLength / 2; // 원점으로 부터 가장 가까운 현재 스택의 모서리 좌표
    const prevStackEdgeXCoordFarCenter =
      prevCoords.x < curCoords.x
        ? prevCoords.x + prevXLength / 2
        : prevCoords.x - prevXLength / 2; // 원점으로부터 가장 먼 이전 스택의 모서리 좌표
    const diff = curStackEdgeXCoordNearCenter - prevStackEdgeXCoordFarCenter; // 이 둘을 뺌으로써 현재 블럭과 이전 블럭이 겹쳐있는 지 여부를 체크할 수 있다.
    isOnPreviousStack = prevCoords.x < curCoords.x ? diff <= 0 : diff >= 0;
  } else {
    // z축 기준
    const curStackEdgeZCoordNearCenter =
      prevCoords.z < curCoords.z
        ? curCoords.z - curZLength / 2
        : curCoords.z + curZLength / 2;
    const prevStackEdgeZCoordFarCenter =
      prevCoords.z < curCoords.z
        ? prevCoords.z + prevZLength / 2
        : prevCoords.z - prevZLength / 2;
    const diff = curStackEdgeZCoordNearCenter - prevStackEdgeZCoordFarCenter;
    isOnPreviousStack = prevCoords.z < curCoords.z ? diff <= 0 : diff >= 0;
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
      prevCoords.x <= curCoords.x
        ? (prevCoords.x + prevXLength / 2 + (curCoords.x - curXLength / 2)) / 2
        : (prevCoords.x - prevXLength / 2 + (curCoords.x + curXLength / 2)) / 2,
      curCoords.y,
      prevCoords.z <= curCoords.z
        ? (prevCoords.z + prevZLength / 2 + (curCoords.z - curZLength / 2)) / 2
        : (prevCoords.z - prevZLength / 2 + (curCoords.z + curZLength / 2)) / 2,
    ],
    fallingShape: [
      dir === 1 ? diff : curXLength,
      0.2,
      dir === 0 ? diff : curZLength,
    ],
    fallingLoc: [
      dir === 1
        ? prevCoords.x <= curCoords.x
          ? (prevCoords.x + prevXLength / 2 + (curCoords.x + curXLength / 2)) /
            2
          : (prevCoords.x - prevXLength / 2 + (curCoords.x - curXLength / 2)) /
            2
        : curCoords.x,
      curCoords.y,
      dir === 0
        ? prevCoords.z <= curCoords.z
          ? (prevCoords.z + prevZLength / 2 + (curCoords.z + curZLength / 2)) /
            2
          : (prevCoords.z - prevZLength / 2 + (curCoords.z - curZLength / 2)) /
            2
        : curCoords.z,
    ],
  };
};

const Text2D = () => {
  return (
    <text
      position-z={-180}
      text="hihihihi"
      anchorX="center"
      anchorY="middle"
      rotation={[0, 0, 0, 0]}
    >
      <meshPhongMaterial attach="material" color={"red"} />
    </text>
  );
};

const DetachedStackItem = ({ detachedPosition, detachedShape, color }) => {
  const [fallingMeshRef, api] = useBox(() => ({
    mass: 150,
    position: detachedPosition,
  }));

  const materialRef = useRef();

  useFrame(() => {
    if (materialRef.current.opacity > 0) {
      materialRef.current.opacity -= 0.005;
    } else {
      fallingMeshRef.current.visible = false;
    }
  });

  return (
    <mesh ref={fallingMeshRef} castShadow receiveShadow>
      <boxGeometry args={detachedShape} />
      <meshLambertMaterial
        color={color}
        ref={materialRef}
        opacity={1}
        transparent={true}
      />
    </mesh>
  );
};

const StackItem = React.forwardRef(
  (
    {
      direction,
      position,
      shape = [1, 0.2, 1],
      detachedPosition,
      detachedShape,
    },
    ref
  ) => {
    const color = useRef(randHex());

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

    return (
      <>
        {detachedPosition && detachedShape && (
          <DetachedStackItem
            color={color.current}
            detachedPosition={detachedPosition}
            detachedShape={detachedShape}
          />
        )}
        <mesh
          position={position}
          ref={ref}
          visible={false}
          castShadow
          receiveShadow
        >
          <boxGeometry args={shape} />
          <meshLambertMaterial color={color.current} />
        </mesh>
      </>
    );
  }
);

const MemoizedStackItem = React.memo(StackItem);

function Stacks({ done, setDone }) {
  const speed = 0.04;

  const camera = useThree((state) => state.camera);

  const isStarting = useRef(false);
  const isCameraMoving = useRef(false);

  const baseStackRef = useRef();
  const latestStackRef = useRef();
  const previousStackRef = useRef();
  const textRef = useRef();

  const direction = useRef(0); // 스택이 날아오는 방향 0: z축 이동, 1: x축 이동 두가지임
  const stackHeight = useRef(0.2); // 스택이 쌓이는 높이

  const [stacks, setStacks] = useState([]); // 스택 위치 어레이

  //console.log(stacks);

  useFrame(() => {
    if (isCameraMoving.current) {
      // 카메라가 움직일 때 프레임 마다 카메라 높이 증가
      if (camera.position.y < stackHeight.current + 2) {
        camera.position.y += 0.02;
        textRef.current.position.y += 0.02;
      } else {
        camera.position.y = stackHeight.current + 2;
        textRef.current.position.y = stackHeight.current;
        isCameraMoving.current = false;
      }
      camera.updateProjectionMatrix();
    }
  });

  useFrame(() => {
    // 마지막 스택 아이템 프레임 마다 움직임
    if (!latestStackRef.current || !previousStackRef.current) return;
    //console.log('isMove?')
    if (direction.current === 1) {
      latestStackRef.current.position.x -= speed;
    } else latestStackRef.current.position.z -= speed;
  });

  const initialize = () => {
    latestStackRef.current = baseStackRef.current;

    camera.position.set(-2, 2.2, -2);
    camera.lookAt(new Vector3(0, stackHeight.current, 0)); // 카메라 위치 초기화
  };

  const setStarting = (start) => {
    isStarting.current = start;
  };

  function createNextStackItem() {
    // 다음 스택 블럭 소환
    let detachedPosition = null;
    let detachedShape = null;
    let remainedPosition = [0, 0, 0];
    let remainedShape = [1, 0.2, 1];

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

      const {
        remainLoc,
        remainShape,
        fallingLoc,
        fallingShape,
        isOnPreviousStack,
      } = detachedCoords;

      if (!isOnPreviousStack) {
        setDone(true);
      }

      remainedPosition = [remainLoc[0], stackHeight.current, remainLoc[2]];
      remainedShape = remainShape;
      detachedPosition = fallingLoc;
      detachedShape = fallingShape;
    } else {
      remainedPosition = [0, stackHeight.current, 0]; // 다음 스택 위치 업데이트
    }

    previousStackRef.current = latestStackRef.current; // 현재 ref를 이전 ref로 넘김

    if (stacks.length >= 1) {
      const len = stacks.length;
      const prev = { ...stacks[len - 1] };

      prev.shape = remainedShape;
      prev.position = [
        remainedPosition[0],
        prev.position[1],
        remainedPosition[2],
      ];
      prev.detachedPosition = detachedPosition;
      prev.detachedShape = detachedShape;

      setStacks((v) => [
        ...v.slice(0, -1),
        { ...prev },
        {
          position: remainedPosition,
          shape: remainedShape,
          detachedPosition: null,
          detachedShape: null,
        },
      ]);
    } else {
      setStacks(() => [
        {
          position: remainedPosition,
          shape: remainedShape,
          detachedPosition,
          detachedShape,
        },
      ]);
    } // 스택 어레이 업데이트

    onMoveCamera(); // 카메라 이동
    stackHeight.current += 0.2; // 다음 스택 높이 업데이트
    direction.current = direction.current === 0 ? 1 : 0; // 다음 스택 방향 업데이트

    //console.log('In Next Stack Function:', previousStackRef, latestStackRef, baseStackRef)
  }

  const onKeyDown = ({ key }) => {
    if (key === " ") {
      setStarting(!isStarting.current);
      if (isStarting.current) createNextStackItem();
    } else if (key === "k") {
      // 'k' 누를 시 새로운 스택 생성 : 테스트용
      if (isStarting.current) createNextStackItem();
    } else if (key === "r") {
      initialize();
    }
  };

  const onMouseClick = () => {
    createNextStackItem();
  };

  const onMoveCamera = () => {
    // 카메라 움직임 활성화 마지막 스택 블럭 위치까지 따라감
    if (!camera) return;
    isCameraMoving.current = true;
  };

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseClick);
    };
  }, [onKeyDown, onMouseClick]);

  useEffect(() => {
    // 처음 캔버스 렌더될 때 초기화 이펙트
    initialize();
  }, []);

  return (
    <>
      <Text
        color="white"
        anchorX="center"
        anchorY="middle"
        fontSize={0.15}
        position={[0.5, 0.2, -0.8]}
        rotation={[Math.PI / 4, Math.PI * 1.25, Math.PI / 4]}
        ref={textRef}
      >
        {stacks.length}
      </Text>
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

function Plane(props) {
  const [planeRef] = usePlane(() => ({
    position: [0, 0, 0],
    rotation: [-Math.PI / 2, 0, 0],
    ...props,
  }));

  return (
    <mesh
      ref={planeRef}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    >
      <ambientLight intensity={0.5} />
      <planeGeometry args={[50, 50]} />
      <MeshReflectorMaterial
        blur={[400, 100]}
        color="#2e263d"
        metalness={0.6}
        roughness={1}
        resolution={1024}
        mixBlur={1}
        mixStrength={15}
        depthScale={1}
        minDepthThreshold={0.85}
      />
    </mesh>
  );
}

function Stack() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(false);
  }, [done]);

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
      <Physics>
        {!done && <Stacks done={done} setDone={setDone} />}
        <Plane />
      </Physics>
      <Environment preset="dawn" />
    </Canvas>
  );
}

export default Stack;
