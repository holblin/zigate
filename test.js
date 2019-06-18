const { ZGCommandCode, ZGDeviceType, ZiGate } = require('./dist/zigate.umd.js');

const zigate = new ZiGate('/dev/ttyUSB0');

zigate.messages$.subscribe((value) => console.dir(value));

let button1 = zigate.createDevice(ZGDeviceType.XiaomiAqaraButton, 'fad1');
console.dir(button1);
button1.pushes$.subscribe((value) => console.log('pushes$ ', value));
button1.battery$.subscribe((value) => console.log('battery$', value));

setTimeout(
  () => {
    let result = zigate.sendCommand(ZGCommandCode.GetDevicesList);
    // console.dir(result);
}, 100);