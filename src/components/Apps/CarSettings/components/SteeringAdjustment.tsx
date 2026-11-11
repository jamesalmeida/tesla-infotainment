import { useCar, useCarActions } from '../../../../state/CarStateContext';
import { AdjustmentPad } from './AdjustmentPad';

export const SteeringAdjustment = ({ onClose }: { onClose: () => void }) => {
  const value = useCar((state) => state.settings.steeringWheel);
  const { setSettings } = useCarActions();

  return (
    <AdjustmentPad
      title="Adjust Steering Wheel"
      value={value}
      onChange={(steeringWheel) => setSettings({ steeringWheel })}
      onClose={onClose}
    />
  );
};
