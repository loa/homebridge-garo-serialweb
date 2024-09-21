import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { GaroAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import type { GaroPlatformConfig, GaroStatusResponse } from './types.js';

export class GaroPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: GaroPlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    const devices = [];

    for (const device of this.config.devices) {
      const response = await fetch(
        `${device.address}/servlet/rest/chargebox/status`,
      );
      const data = (await response.json()) as GaroStatusResponse;

      // TODO: get model from rest api
      devices.push({
        serialnumber: String(data.serialNumber),
        model: 'GARO',
        address: device.address,
      });
    }

    for (const device of devices) {
      const uuid = this.api.hap.uuid.generate(device.serialnumber);

      const existingAccessory = this.accessories.find(
        (accessory) => accessory.UUID === uuid,
      );

      if (existingAccessory) {
        this.log.info(
          'Restoring existing accessory from cache:',
          existingAccessory.displayName,
        );

        new GaroAccessory(this, existingAccessory);
      } else {
        this.log.info('Adding new accessory:', device.serialnumber);

        const accessory = new this.api.platformAccessory(
          device.serialnumber,
          uuid,
        );

        accessory.context.device = device;

        new GaroAccessory(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }
    }
  }
}
