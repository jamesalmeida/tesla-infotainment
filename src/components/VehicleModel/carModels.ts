import type { CarModel } from '../../state/sampleData';

export type LightGroup =
  'headlights' | 'fog' | 'leftSignal' | 'rightSignal' | 'brake' | 'reverse' | 'rear';

// What the 3D view needs to know about one car's model file. Every file shares the rig the
// animation code drives: a Z-up car (+Y front, +X right) drawn at 0.01 scale, with the nodes
// bonnet_dummy, boot_dummy, door_{lf,lr,rf,rr}_dummy and the axles in SPINNING_WHEEL_NODES.
export interface CarModelSpec {
  file: string;
  // Nodes whose meshes light up for each lamp group. A mesh may only be in one group:
  // each group gives its meshes their own material copy.
  lights: Record<LightGroup, readonly string[]>;
  // Materials the Paint Shop recolours.
  paintMaterials: readonly string[];
  // A node at the charge port, on the car's left side near the back.
  chargePortNode: string;
}

export const CAR_MODEL_SPECS: Record<CarModel, CarModelSpec> = {
  // Ameer Studio's 2018 Model 3 (CC-BY), rigged as downloaded.
  'model-3': {
    file: 'tesla-model-3-2018.glb',
    lights: {
      // Both headlamps' meshes sit under this one node.
      headlights: ['chrome_Lights_head_l'],
      fog: ['foglights_l', 'foglights_r', 'chrome_foglight_l', 'chrome_foglight_r'],
      leftSignal: ['turn_indicat_l', 'indicator_lights_l', 'light_turn_lr_boot'],
      rightSignal: ['turn_indicat_r', 'indicator_lights_r', 'light_turn_rr_boot'],
      brake: ['light_breake', 'breake_int'],
      reverse: ['lightrevese_boot'],
      rear: ['rear_lights', 'rear_lightsl', 'rear_lightsr', 'back_chrome_light', 'chrome_light'],
    },
    paintMaterials: ['primary', 'primary.001', 'primary.002'],
    chargePortNode: 'rear_lightsl',
  },
  // BloxBloger's 2026 Model Y Performance (CC-BY-NC-4.0). The download is one mesh per
  // material, so its panels were cut apart and hinged to match the Model 3's rig.
  'model-y': {
    file: 'tesla-model-y-2026.glb',
    lights: {
      headlights: ['headlight_l', 'headlight_r', 'light_bar_front'],
      // This car has no fog lamps.
      fog: [],
      leftSignal: ['signal_front_l', 'signal_rear_l'],
      rightSignal: ['signal_front_r', 'signal_rear_r'],
      brake: ['tail_led_l', 'tail_led_r'],
      reverse: ['reverse_l', 'reverse_r'],
      rear: ['light_bar_rear', 'rear_reflector_l', 'rear_reflector_r'],
    },
    paintMaterials: ['paint'],
    chargePortNode: 'signal_rear_l',
  },
};
