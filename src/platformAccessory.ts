import type {
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';
import fetch from 'node-fetch';

import type { GaroPlatform } from './platform.js';
import type { GaroStatusResponse } from './types.js';

export class GaroAccessory {
  private service: Service;

  constructor(
    private readonly platform: GaroPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Garo')
      .setCharacteristic(
        this.platform.Characteristic.Model,
        this.accessory.context.device.model,
      )
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.accessory.context.device.serialnumber,
      );

    this.service =
      this.accessory.getService(this.platform.Service.Outlet) ||
      this.accessory.addService(this.platform.Service.Outlet);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.serialnumber,
    );

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.OutletInUse)
      .onGet(this.getInUse.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    this.platform.log.debug('Set Characteristic On ->', value);

    const mode = (value as boolean) ? 'ALWAYS_ON' : 'ALWAYS_OFF';

    const url = `${this.accessory.context.device.address}/servlet/rest/chargebox/mode/${mode}`;

    await fetch(url, { method: 'POST' });
  }

  async getOn(): Promise<CharacteristicValue> {
    const response = await fetch(
      `${this.accessory.context.device.address}/servlet/rest/chargebox/status`,
    );
    const data = (await response.json()) as GaroStatusResponse;

    const isOn = data.mode === 'ALWAYS_ON';

    this.platform.log.debug('Get Characteristic On ->', isOn);

    return isOn;
  }

  async getInUse(): Promise<CharacteristicValue> {
    const response = await fetch(
      `${this.accessory.context.device.address}/servlet/rest/chargebox/status`,
    );
    const data = (await response.json()) as GaroStatusResponse;

    const inUse = data.mainCharger.connector !== 'INITIALIZATION';

    this.platform.log.debug(`Get Characteristic OutletInUse (${data.mainCharger.connector}) ->`, inUse);

    return inUse;
  }
}
