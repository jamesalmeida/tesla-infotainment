import { useCar, useCarActions } from '../../../../state/CarStateContext';
import type { MapUnits, SuperchargerFilters } from '../../../../state/carState';
import { Choice, Page, Section, Slider, Toggle, panelStyles } from './SystemPanel';

const UNIT_OPTIONS: { value: MapUnits; label: string }[] = [
  { value: 'mi', label: 'Miles' },
  { value: 'km', label: 'Kilometres' },
];

const POWER_OPTIONS: { value: SuperchargerFilters['minPowerKw']; label: string }[] = [
  { value: 0, label: 'Any' },
  { value: 150, label: '150 kW+' },
  { value: 250, label: '250 kW+' },
];

const percent = (value: number) => `${value}%`;

export const Navigation = () => {
  const settings = useCar((state) => state.settings);
  const { setSettings } = useCarActions();
  const filters = settings.superchargerFilters;
  const setFilters = (patch: Partial<SuperchargerFilters>) =>
    setSettings({ superchargerFilters: { ...filters, ...patch } });

  return (
    <Page title="Navigation">
      <div className={panelStyles.twoColumns}>
        <Section title="Routes">
          <Toggle
            label="Online Routing"
            hint="Reroutes around traffic while you drive."
            checked={settings.onlineRouting}
            onChange={(onlineRouting) => setSettings({ onlineRouting })}
          />
          <Toggle
            label="Avoid Tolls"
            checked={settings.avoidTolls}
            onChange={(avoidTolls) => setSettings({ avoidTolls })}
          />
          <Toggle
            label="Avoid Ferries"
            checked={settings.avoidFerries}
            onChange={(avoidFerries) => setSettings({ avoidFerries })}
          />
        </Section>
        <Section title="Trip Planner">
          <Toggle
            label="Trip Planner"
            hint="Adds charging stops to long routes."
            checked={settings.tripPlanner}
            onChange={(tripPlanner) => setSettings({ tripPlanner })}
          />
          <Slider
            label="Arrival Charge"
            hint="How much battery to have left at the destination."
            value={settings.arrivalChargeTarget}
            min={0}
            max={50}
            step={5}
            disabled={!settings.tripPlanner}
            format={percent}
            onChange={(arrivalChargeTarget) => setSettings({ arrivalChargeTarget })}
          />
        </Section>
      </div>
      <div className={panelStyles.twoColumns}>
        <Section title="Map and Voice">
          <Choice
            label="Distance Units"
            value={settings.mapUnits}
            options={UNIT_OPTIONS}
            onChange={(mapUnits) => setSettings({ mapUnits })}
          />
          <Slider
            label="Voice Guidance Volume"
            value={settings.navVolume}
            min={0}
            max={100}
            format={(value) => (value === 0 ? 'Muted' : percent(value))}
            onChange={(navVolume) => setSettings({ navVolume })}
          />
        </Section>
        <Section title="Supercharger Filters" hint="Which charging sites the map shows.">
          <Choice
            label="Minimum Power"
            value={filters.minPowerKw}
            options={POWER_OPTIONS}
            onChange={(minPowerKw) => setFilters({ minPowerKw })}
          />
          <Toggle
            label="Food Nearby"
            checked={filters.food}
            onChange={(food) => setFilters({ food })}
          />
          <Toggle
            label="Restrooms"
            checked={filters.restrooms}
            onChange={(restrooms) => setFilters({ restrooms })}
          />
          <Toggle
            label="Shopping"
            checked={filters.shopping}
            onChange={(shopping) => setFilters({ shopping })}
          />
        </Section>
      </div>
    </Page>
  );
};
