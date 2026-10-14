<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

# Homebridge Garo Serialweb

Homebridge plugin that exposes a local [GARO](https://www.garo.se/) charge box as a HomeKit outlet. It talks to the charger through **serialweb**, the web service that runs on the GARO Wi-Fi module.

> **The serialweb Raspberry Pi add-on is required.** This plugin only works when that module is installed in the charger and reachable on the same network as Homebridge. A charger without the add-on has no serialweb API to control.

## Supported chargers

The add-on is the GARO WLAN communication module **GLB-WLAN** (article **353437**, also sold as **WIFI MODUL GLB/GTB/GTC**). It is a Raspberry Pi board. Wi-Fi models ship with it fitted. The same module can be installed later in chargers sold without Wi-Fi. In a cluster, one module in the master charger is enough.

| Series | What it is | Works with this plugin |
| --- | --- | --- |
| **GLB** | Single-outlet wallbox, including GLB, GLBW, GLBM, GLBDC, GLBDCW and GLBDCWM | Yes, with the serialweb module installed |
| **GTB** | Twinbox with two outlets, including GTBDC, GTBDCW and GTBDCM | Yes, with the serialweb module installed |
| **GTC** | GTC Nova stations, including GTCDC and GTCDCW | Yes, with the serialweb module installed |

These later GARO chargers use a different controller and do not run serialweb:

- GLB+
- GTB+ and Twin+
- LS4
- Entity

Each configured module becomes one HomeKit accessory, named with the charge-box serial number reported by serialweb. The on/off command sets the charge-box mode for that module. Connector state is read from `mainCharger`.

## Serialweb

serialweb is the local web application (`serialweb.war`) on the Raspberry Pi add-on. It is the same interface used to set Wi-Fi, schedules, RFID and load balancing. This plugin uses its REST API. It does not use the GARO cloud.

### Reach the module

The module starts as its own access point. The SSID and password are on the label inside the front cover (GLB: behind the black front). Connect to that network and open <http://172.24.1.1>.

Join the module to the home network from that page, over Wi-Fi or the RJ45 port on the module. Only 2.4 GHz WPA/WPA2 networks with a password are supported. After it is on the LAN, open the UI from a device on the same network:

- `http://<module-ip>:8080/serialweb/`
- or <http://chargebox.garo.se>, which the manuals tell you to use once the charger is on the local network

Give the module a stable DHCP reservation. The plugin needs that address on every restart.

Confirm serialweb answers before adding it to Homebridge:

```shell
curl -sS http://192.168.1.50:8080/servlet/rest/chargebox/status
```

A working module returns JSON with `serialNumber`, `mode` and `mainCharger`. Firmware from **1.3.1** onward serves this path on port **8080**. Older modules used `http://<module-ip>:2222/rest/chargebox/status`. This plugin calls the port 8080 servlet paths, so update the module from `http://<module-ip>:8080/update` (package from <https://www.webel-online.se/wifi>) when the status URL above does not respond.

### Status

```http
GET /servlet/rest/chargebox/status
```

The fields this plugin reads:

```json
{
  "serialNumber": 1234567,
  "mode": "ALWAYS_ON",
  "mainCharger": {
    "reference": "Primary",
    "serialNumber": 1234567,
    "connector": "CHARGING"
  }
}
```

`mode` is the charge-box mode:

| Value | Meaning |
| --- | --- |
| `ALWAYS_ON` | Charging is allowed |
| `ALWAYS_OFF` | Charging is disabled |
| `SCHEMA` | The schedule configured in the serialweb UI is in control |

`mainCharger.connector` is the outlet state. Values seen on these chargers include `INITIALIZATION`, `NOT_CONNECTED`, `CONNECTED`, `SEARCH_COMM`, `CHARGING`, `CHARGING_PAUSED`, `CHARGING_FINISHED`, `CHARGING_CANCELLED`, `DISABLED`, and fault values such as `RCD_FAULT`, `OVERHEAT`, `CABLE_FAULT` and `CONTACTOR_FAULT`. A twinbox also returns `twinCharger` with the same shape. This plugin reads `mainCharger` only.

### Set the mode

```http
POST /servlet/rest/chargebox/mode/ALWAYS_ON
POST /servlet/rest/chargebox/mode/ALWAYS_OFF
POST /servlet/rest/chargebox/mode/SCHEMA
```

The body is empty. HomeKit on sends `ALWAYS_ON`. HomeKit off sends `ALWAYS_OFF`. The plugin leaves `SCHEMA` to the serialweb UI. While the box is in `SCHEMA`, the HomeKit outlet reports off, because `mode` is not `ALWAYS_ON`.

The same API also has `config`, `schema`, `currentlimit`, `meterinfo/CENTRAL100`, `meterinfo/EXTERNAL`, `slaves` and `lbconfig`. This plugin does not call those.

## Installation

Install from the Homebridge UI, or:

```shell
sudo npm install -g homebridge-garo-serialweb
```

Requires Homebridge `^1.8.0` or `^2.0.0-beta.0`, and Node.js 18, 20 or 22.

## Configuration

Add the platform in the Homebridge UI, or in `config.json`. `address` is the base URL of the serialweb module, including `http://` and port `8080`.

```json
{
  "platforms": [
    {
      "platform": "GaroSerialweb",
      "name": "GaroSerialweb",
      "devices": [
        {
          "address": "http://192.168.1.50:8080"
        }
      ]
    }
  ]
}
```

Add one entry per module. Restart Homebridge after changing the list. The plugin creates an accessory the first time the status request succeeds, and restores it from the Homebridge cache after that.

## HomeKit

Each charger is an **Outlet**:

| HomeKit | serialweb |
| --- | --- |
| On | `POST .../mode/ALWAYS_ON` |
| Off | `POST .../mode/ALWAYS_OFF` |
| Outlet In Use | `mainCharger.connector` is any value other than `INITIALIZATION` |

Manufacturer is `Garo`. The model shown in HomeKit is `GARO`. Name and serial number are the charge-box serial number from the status response.

## License

[Apache-2.0](./LICENSE)
