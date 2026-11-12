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
import { Box3, Vector3 } from 'three';
import type * as THREE from 'three';
import { getCarModelPath } from '../../utils/assetPaths';
import { paintHex, type PaintColor } from '../../state/sampleData';
import type { CarLightState } from './vehicleLights';
import { setCompartmentAnchors, type ScreenPoint } from './compartmentAnchors';
import {
  AZIMUTH_RETURN_DELAY_MS,
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
  SPINNING_WHEEL_NODES,
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
  // Lamps and paint follow the store, so the 3D car shows what the screen says.
  lights?: CarLightState;
  paint?: PaintColor;
  speed?: number;
  // How much room the camera leaves around the car. Below 1 the car fills more of the view.
  fitMargin?: number;
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

type EmissiveMaterial = THREE.MeshStandardMaterial & {
  emissive: THREE.Color;
  emissiveIntensity: number;
};

// The GLB reuses a few light materials across unrelated lamps, so each group gets its own
// copy. Without that, a left indicator would also light the right one.
const LIGHT_NODE_GROUPS = {
  headlights: [
    'chrome_Lights_head_l',
    'chrome_Lights_head_l_right front light',
    'chrome_Lights_head_l_left front light',
  ],
  fog: ['foglights_l', 'foglights_r', 'chrome_foglight_l', 'chrome_foglight_r'],
  leftSignal: ['turn_indicat_l', 'indicator_lights_l', 'light_turn_lr_boot'],
  rightSignal: ['turn_indicat_r', 'indicator_lights_r', 'light_turn_rr_boot'],
  brake: ['light_breake', 'breake_int'],
  reverse: ['lightrevese_boot'],
  rear: ['rear_lights', 'rear_lightsl', 'rear_lightsr', 'back_chrome_light', 'chrome_light'],
} as const;

type LightGroup = keyof typeof LIGHT_NODE_GROUPS;

const collectMeshes = (root: THREE.Object3D, names: readonly string[]): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = [];
  names.forEach((name) => {
    root.getObjectByName(name)?.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Give every lamp its own material instance.
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
      meshes.push(mesh);
    });
  });
  return meshes;
};

const setEmissive = (meshes: THREE.Mesh[], color: string, intensity: number) => {
  meshes.forEach((mesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const lit = material as EmissiveMaterial;
      if (!lit.emissive) return;
      lit.emissive.set(color);
      lit.emissiveIntensity = intensity;
      lit.needsUpdate = true;
    });
  });
};

const PAINT_MATERIALS = new Set(['primary', 'primary.001', 'primary.002']);

const collectPaintMaterials = (root: THREE.Object3D): EmissiveMaterial[] => {
  const materials: EmissiveMaterial[] = [];
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    list.forEach((material) => {
      const paint = material as EmissiveMaterial;
      if (PAINT_MATERIALS.has(material.name) && !materials.includes(paint)) materials.push(paint);
    });
  });
  return materials;
};

function Model({
  pose,
  doors,
  onDoorToggle,
  onReady,
  pressRef,
  lights,
  paint,
  speed = 0,
  ...props
}: ModelProps) {
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

  const lightGroups = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(LIGHT_NODE_GROUPS).map(([key, names]) => [key, collectMeshes(scene, names)]),
      ) as Record<LightGroup, THREE.Mesh[]>,
    [scene],
  );
  const paintMaterials = useMemo(() => collectPaintMaterials(scene), [scene]);
  // Each axle spins about its own centre. Their shared parent, wheel_rf_dummy, sits on the
  // front axle with the rear axle as a child, so spinning it swings the rear wheels around
  // the front ones and they come off the car.
  const wheels = useMemo(
    () =>
      SPINNING_WHEEL_NODES.map((name) => scene.getObjectByName(name)).filter(
        (wheel): wheel is THREE.Object3D => Boolean(wheel),
      ),
    [scene],
  );
  const wheelAngle = useRef(0);
  // Where the frunk and trunk leader lines end, in the car's own space: the middle of each lid.
  const anchorsRef = useRef<{ frunk: Vector3 | null; trunk: Vector3 | null } | null>(null);

  // The canvas only draws on request, so a change has to ask for the first frame. Coming
  // back to the tab asks too, in case an animation was cut off when the tab was hidden.
  useEffect(() => {
    invalidate();
  }, [invalidate, pose, doorStates, frameloop]);

  useEffect(() => {
    if (!lights) return;
    setEmissive(
      lightGroups.headlights,
      '#ffffff',
      lights.headlights ? (lights.highBeams ? 2.4 : 1.4) : 0,
    );
    setEmissive(lightGroups.fog, '#ffd27a', lights.fog ? 1.1 : 0);
    setEmissive(lightGroups.leftSignal, '#ffb300', lights.leftSignal ? 1.8 : 0);
    setEmissive(lightGroups.rightSignal, '#ffb300', lights.rightSignal ? 1.8 : 0);
    setEmissive(lightGroups.brake, '#ff2b2b', lights.brake ? 1.8 : 0.25);
    setEmissive(lightGroups.reverse, '#ffffff', lights.reverse ? 1.4 : 0);
    setEmissive(lightGroups.rear, '#ff2b2b', lights.brake ? 1.5 : lights.headlights ? 0.5 : 0.2);
    invalidate();
  }, [
    invalidate,
    lightGroups,
    lights?.headlights,
    lights?.highBeams,
    lights?.fog,
    lights?.leftSignal,
    lights?.rightSignal,
    lights?.brake,
    lights?.reverse,
  ]);

  useEffect(() => {
    if (!paint) return;
    const hex = paintHex(paint);
    paintMaterials.forEach((material) => {
      material.color.set(hex);
      material.needsUpdate = true;
    });
    invalidate();
  }, [invalidate, paint, paintMaterials]);

  // Each frame the lids are projected onto the screen, so the labels' lines follow the car
  // as it turns or the camera orbits.
  const publishAnchors = (state: { camera: THREE.Camera; gl: THREE.WebGLRenderer }) => {
    if (!anchorsRef.current) {
      scene.updateWorldMatrix(true, true);
      const carCentre = new Box3().setFromObject(scene).getCenter(new Vector3());
      // The middle of the lid, moved a quarter of its length out towards its end of the car:
      // the trunk lid's box takes in the rear glass, so its plain middle sits on the roof.
      const lidTop = (node: THREE.Object3D | undefined) => {
        if (!node) return null;
        const box = new Box3().setFromObject(node);
        if (box.isEmpty()) return null;
        const centre = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3());
        const outward = new Vector3(centre.x - carCentre.x, 0, centre.z - carCentre.z);
        if (outward.lengthSq() > 0) {
          outward.normalize();
          const halfLength = (Math.abs(outward.x) * size.x + Math.abs(outward.z) * size.z) / 2;
          centre.addScaledVector(outward, halfLength / 2);
        }
        return scene.worldToLocal(centre);
      };
      anchorsRef.current = { frunk: lidTop(nodes.frunk), trunk: lidTop(nodes.trunk) };
    }
    const rect = state.gl.domElement.getBoundingClientRect();
    const toScreen = (local: Vector3 | null): ScreenPoint | null => {
      if (!local || rect.width === 0) return null;
      const point = scene.localToWorld(local.clone()).project(state.camera);
      return {
        x: rect.left + ((point.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - point.y) / 2) * rect.height,
      };
    };
    setCompartmentAnchors({
      frunk: toScreen(anchorsRef.current.frunk),
      trunk: toScreen(anchorsRef.current.trunk),
    });
  };

  useFrame((state, delta) => {
    const targets = getPartTargets(pose, doorStates);
    // The first frame places the car in its pose. Later changes animate.
    partsRef.current ??= createParts(targets);
    const isMoving = stepParts(partsRef.current, targets, delta);
    applyParts(nodes, partsRef.current);
    publishAnchors(state);
    if (speed > 0) {
      wheelAngle.current += speed * delta * 0.08;
      wheels.forEach((wheel) => {
        wheel.rotation.x = wheelAngle.current;
      });
      state.invalidate();
    } else if (isMoving) {
      state.invalidate();
    }
  });

  useEffect(() => () => setCompartmentAnchors({ frunk: null, trunk: null }), []);

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
  const returnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => () => clearTimeout(returnTimer.current), []);

  const handleStart = () => {
    clearTimeout(returnTimer.current);
    azimuthRef.current = null;
  };

  // The car stays where it was spun to, and only eases back once it has been left alone.
  const handleEnd = () => {
    clearTimeout(returnTimer.current);
    returnTimer.current = setTimeout(() => {
      const controls = controlsRef.current;
      if (!controls) return;
      azimuthRef.current = {
        value: nearestAngle(controls.getAzimuthalAngle(), DEFAULT_AZIMUTH),
        velocity: 0,
      };
      invalidate();
    }, AZIMUTH_RETURN_DELAY_MS);
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

export function VehicleModel({
  pose,
  doors,
  onDoorToggle,
  onReady,
  lights,
  paint,
  speed = 0,
  fitMargin = 1,
}: VehicleModelProps) {
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
      <Stage environment={stageEnvironment} adjustCamera={fitMargin}>
        <Model
          scale={0.01}
          pose={pose}
          doors={doors}
          onDoorToggle={onDoorToggle}
          onReady={onReady}
          pressRef={pressRef}
          lights={lights}
          paint={paint}
          speed={speed}
        />
      </Stage>
      <ControlledOrbitControls />
    </Canvas>
  );
}
