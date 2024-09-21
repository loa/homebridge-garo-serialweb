import type { PlatformConfig } from 'homebridge';

export interface GaroPlatformConfig extends PlatformConfig {
  devices: GaroPlatformConfigDevice[];
}
export interface GaroPlatformConfigDevice {
  address: string;
}

export interface GaroStatusResponse {
  serialNumber: number;
  mode: string;
}
