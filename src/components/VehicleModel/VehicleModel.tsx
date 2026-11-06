import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentRef,
  type PointerEvent,
  type RefObject,
} from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Stage, useEnvironment, useGLTF, OrbitControls } from '@react-three/drei';
import type * as THREE from 'three';
import { getCarModelPath } from '../../utils/assetPaths';
import {
  AZIMUTH_SMOOTH_TIME,
  CLOSED_DOORS,
  DEFAULT_AZIMUTH,
  DOOR_IDS,
  createParts,
  doorNodeName,
  findDoorId,
  getPartTargets,
  isClick,
  nearestAngle,
  stepDamped,
  stepParts,
  type CarParts,
  type Damped,
  type DoorId,
  type DoorStates,
  type VehiclePose,
} from './vehiclePose';
import styles from './VehicleModel.module.css';

export type { DoorId, DoorStates, VehiclePose };

interface VehicleModelProps {
  pose: VehiclePose;
  // Controls the doors. Leave it out and the model keeps its own door state.
  doors?: DoorStates;
  onDoorToggle?: (door: DoorId) => void;
  // Called once the model has loaded, which is what the loading screen waits for.
  onReady?: () => void;
}

interface ModelProps extends VehicleModelProps {
  scale?: number;
  pressRef: RefObject<PointerPress>;
}

interface PointerPress {
  x: number;
  y: number;
  // The furthest the pointer has got from where it went down, in pixels. Measuring only
  // the two ends would read a drag that came back to its start as a click.
  travel: number;
}

interface CarNodes {
  car: THREE.Object3D;
  frunk: THREE.Object3D | undefined;
  trunk: THREE.Object3D | undefined;
  doors: Partial<Record<DoorId, THREE.Object3D>>;
}

type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;

// Stage's Bounds refits the camera distance, but keeps this direction.
const CAMERA_ELEVATION = Math.PI / 5.14;
const CAMERA_POSITION: [number, number, number] = [
  5 * Math.cos(CAMERA_ELEVATION) * Math.sin(DEFAULT_AZIMUTH),
  5 * Math.sin(CAMERA_ELEVATION),
  5 * Math.cos(CAMERA_ELEVATION) * Math.cos(DEFAULT_AZIMUTH),
];

const ORBIT_TARGET: [number, number, number] = [0, -0.5, 0];
const ORBIT_POLAR_ANGLE = Math.PI / 2 - CAMERA_ELEVATION;

const modelPath = getCarModelPath('tesla-model-3-2018.glb');

// Poly Haven's Empty Warehouse 01 (CC0), halved from the 1k file. It only lights the car,
// so the extra resolution bought nothing. Stage's presets download from a third-party CDN.
const stageEnvironment = {
  files: `${import.meta.env.BASE_URL}environments/empty_warehouse_01_512.hdr`,
};

// Start downloading these while the loading screen is up, not when the canvas mounts.
useGLTF.preload(modelPath);
useEnvironment.preload(stageEnvironment);

function applyParts(nodes: CarNodes, parts: CarParts) {
  nodes.car.rotation.y = parts.rotation.value;
  if (nodes.frunk) nodes.frunk.rotation.x = parts.frunk.value;
  if (nodes.trunk) nodes.trunk.rotation.x = parts.trunk.value;
  for (const id of DOOR_IDS) {
    const door = nodes.doors[id];
    if (door) door.rotation.z = parts[id].value;
  }
}

function Model({ pose, doors, onDoorToggle, onReady, pressRef, ...props }: ModelProps) {
  const { scene } = useGLTF(modelPath);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  const frameloop = useThree((state) => state.frameloop);
  const [localDoors, setLocalDoors] = useState(CLOSED_DOORS);
  const doorStates = doors ?? localDoors;
  const partsRef = useRef<CarParts | null>(null);
  const nodes = useMemo<CarNodes>(
    () => ({
      car: scene,
      frunk: scene.getObjectByName('bonnet_dummy'),
      trunk: scene.getObjectByName('boot_dummy'),
      doors: Object.fromEntries(
        DOOR_IDS.map((id) => [id, scene.getObjectByName(doorNodeName(id))]),
      ),
    }),
    [scene],
  );

  // The canvas only draws on request, so a change has to ask for the first frame. Coming
  // back to the tab asks too, in case an animation was cut off when the tab was hidden.
  useEffect(() => {
    invalidate();
  }, [invalidate, pose, doorStates, frameloop]);

  useFrame((state, delta) => {
    const targets = getPartTargets(pose, doorStates);
    // The first frame places the car in its pose. Later changes animate.
    partsRef.current ??= createParts(targets);
    const isMoving = stepParts(partsRef.current, targets, delta);
    applyParts(nodes, partsRef.current);
    if (isMoving) state.invalidate();
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!isClick(pressRef.current.travel)) return;
    const door = findDoorId(event.object);
    if (!door) return;
    if (!doors) setLocalDoors((current) => ({ ...current, [door]: !current[door] }));
    onDoorToggle?.(door);
  };

  return (
    <group onClick={handleClick}>
      <primitive object={scene} {...props} />
    </group>
  );
}

function ControlledOrbitControls() {
  const controlsRef = useRef<OrbitControlsHandle>(null);
  const azimuthRef = useRef<Damped | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  const handleStart = () => {
    azimuthRef.current = null;
  };

  const handleEnd = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    azimuthRef.current = {
      value: nearestAngle(controls.getAzimuthalAngle(), DEFAULT_AZIMUTH),
      velocity: 0,
    };
    invalidate();
  };

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    const azimuth = azimuthRef.current;
    if (!controls || !azimuth) return;
    const isMoving = stepDamped(azimuth, DEFAULT_AZIMUTH, AZIMUTH_SMOOTH_TIME, delta);
    controls.setAzimuthalAngle(azimuth.value);
    if (isMoving) state.invalidate();
    else azimuthRef.current = null;
  });

  // With damping on, setAzimuthalAngle moves 5% of the way and carries the rest into later
  // updates, which would fight the ease back to the default angle.
  return (
    <OrbitControls
      ref={controlsRef}
      target={ORBIT_TARGET}
      enableDamping={false}
      enableZoom={false}
      enablePan={false}
      enableRotate={true}
      minPolarAngle={ORBIT_POLAR_ANGLE}
      maxPolarAngle={ORBIT_POLAR_ANGLE}
      onStart={handleStart}
      onEnd={handleEnd}
    />
  );
}

function subscribeToTabVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

const isTabHidden = () => document.hidden;

export function VehicleModel({ pose, doors, onDoorToggle, onReady }: VehicleModelProps) {
  const tabHidden = useSyncExternalStore(subscribeToTabVisibility, isTabHidden);
  const pressRef = useRef<PointerPress>({ x: 0, y: 0, travel: 0 });

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pressRef.current = { x: event.clientX, y: event.clientY, travel: 0 };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    const distance = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    press.travel = Math.max(press.travel, distance);
  };

  return (
    <Canvas
      frameloop={tabHidden ? 'never' : 'demand'}
      dpr={[1, 2]}
      camera={{
        fov: 40,
        position: CAMERA_POSITION,
        near: 0.1,
        far: 1000,
      }}
      style={{ position: 'relative' }}
      className={styles.carModelWrapper}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <color attach="background" args={['#f1f1f1']} />
      <Stage environment={stageEnvironment}>
        <Model
          scale={0.01}
          pose={pose}
          doors={doors}
          onDoorToggle={onDoorToggle}
          onReady={onReady}
          pressRef={pressRef}
        />
      </Stage>
      <ControlledOrbitControls />
    </Canvas>
  );
}
