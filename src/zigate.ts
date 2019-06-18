import net from 'net'
import SerialPort from 'serialport'
import { ZGFrame } from './frame'
import { createZGMessage, ZGMessage } from './message'
import { Observable, fromEvent } from 'rxjs'
import { map, share } from 'rxjs/operators'
import { createZGCommand, ZGCommandCode, ZGCommandPayload } from './command'
import { createZGDevice, ZGDevice, ZGDeviceType } from './device'
import debug from './debug'
import Delimiter = SerialPort.parsers.Delimiter

export { ZGDeviceType } from './device'
export { ZGCommandCode, ZGCommandPayload } from './command'

export class ZiGate {
  messages$: Observable<ZGMessage>

  // private serialPort: SerialPort
  private serialPortParser: Delimiter
  private port: net.Socket
  private ip: string

  constructor(path: string) {
    this.ip = '192.168.1.35'
    this.port = net.createConnection(9999, this.ip)

    // this.serialPort = new SerialPort(path, {
    //   baudRate: 115200
    // })

    this.serialPortParser = this.port.pipe(
      new SerialPort.parsers.Delimiter({
        delimiter: [ZGFrame.STOP_BYTE],
        includeDelimiter: true
      })
    )

    this.messages$ = fromEvent(this.serialPortParser, 'data').pipe(
      map((frame: Buffer) => {
        debug('serial:in')(frame)
        // console.log('<= ' + Buffer.concat([frame, Buffer.from([ZGFrame.STOP_BYTE])], frame.length + 1).toString('hex'));
        // // return frame;
        // const zgFrame = new ZGFrame(Buffer.concat([frame, Buffer.from([ZGFrame.STOP_BYTE])], frame.length + 1))
        console.log('<= ' + frame.toString('hex'))
        // return frame;
        const zgFrame = new ZGFrame(frame)
        return createZGMessage(zgFrame.readMsgCode(), zgFrame.msgPayloadBytes)
      }),
      share()
    )

    this.serialPortParser.on('error', err => {
      console.error(err.message)
    })
  }

  sendCommand = (code: ZGCommandCode, payload?: ZGCommandPayload) => {
    const zgCmd = createZGCommand(code, payload)
    const frame = new ZGFrame()

    frame.writeMsgCode(zgCmd.getCode())

    if (zgCmd.getBufferedPayload) {
      frame.writeMsgPayload(zgCmd.getBufferedPayload())
    }

    debug('serial:out')(frame.toBuffer())
    console.log('=> ' + frame.toBuffer().toString('hex'))
    this.port.write(frame.toBuffer())
  }

  createDevice = (type: ZGDeviceType, shortAddress: string): ZGDevice => {
    return createZGDevice(this, type, shortAddress)
  }
}
