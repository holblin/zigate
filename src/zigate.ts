import SerialPort from 'serialport'
import { ZGFrame } from './frame'
import { createZGMessage, ZGMessage } from './message'
import { Observable, fromEvent } from 'rxjs'
import { map, share } from 'rxjs/operators'
import { createZGCommand, ZGCommandCode, ZGCommandPayload } from './command'
import { createZGDevice, ZGDevice, ZGDeviceType } from './device'
import debug from './debug'
import Delimiter = SerialPort.parsers.Delimiter
import { Socket, createConnection } from 'net'

export { ZGDeviceType } from './device'
export { ZGCommandCode, ZGCommandPayload } from './command'

export class ZiGate {
  messages$: Observable<ZGMessage>

  port: SerialPort | Socket
  parser: Delimiter

  constructor(path: string) {
    if (path.indexOf('net://') === 0) {
      this.port = createConnection(9999, path.substr(6))
    } else if (path.indexOf('file://') === 0) {
      this.port = new SerialPort(path.substr(7), {
        baudRate: 115200
      })
    } else {
      throw new Error('unknown endpoint for zigate')
    }

    this.parser = this.port.pipe(
      new SerialPort.parsers.Delimiter({
        delimiter: [ZGFrame.STOP_BYTE]
      })
    )

    this.messages$ = fromEvent(this.parser, 'data').pipe(
      map((frame: Buffer) => {
        debug('serial:in')(frame)
        const zgFrame = new ZGFrame(frame)
        return createZGMessage(zgFrame.readMsgCode(), zgFrame.msgPayloadBytes)
      }),
      share()
    )

    this.parser.on('error', err => {
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
    this.port.write(frame.toBuffer())
  }

  createDevice = (type: ZGDeviceType, shortAddress: string): ZGDevice => {
    return createZGDevice(this, type, shortAddress)
  }
}
