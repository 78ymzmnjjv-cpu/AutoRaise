// どこかのアプリが既定のマイクを使っているかを監視し、変わるたびに "1" / "0" を1行で出力する。
// ビルド: npm run build:helpers （Xcode Command Line Tools が必要）
import CoreAudio
import Foundation

setvbuf(stdout, nil, _IOLBF, 0)

func defaultInputDevice() -> AudioObjectID {
    var device = AudioObjectID(kAudioObjectUnknown)
    var size = UInt32(MemoryLayout<AudioObjectID>.size)
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultInputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &device)
    return device
}

func isRunning(_ device: AudioObjectID) -> Bool {
    var running: UInt32 = 0
    var size = UInt32(MemoryLayout<UInt32>.size)
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyDeviceIsRunningSomewhere,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    AudioObjectGetPropertyData(device, &addr, 0, nil, &size, &running)
    return running != 0
}

var current = defaultInputDevice()
var last: Bool? = nil

func report() {
    let now = isRunning(current)
    if now != last {
        print(now ? "1" : "0")
        last = now
    }
}

var runningAddr = AudioObjectPropertyAddress(
    mSelector: kAudioDevicePropertyDeviceIsRunningSomewhere,
    mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain)
var defaultAddr = AudioObjectPropertyAddress(
    mSelector: kAudioHardwarePropertyDefaultInputDevice,
    mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain)

let onRunning: AudioObjectPropertyListenerBlock = { _, _ in report() }
AudioObjectAddPropertyListenerBlock(current, &runningAddr, DispatchQueue.main, onRunning)

// 既定のマイクが変わったら（AirPods をつないだ等）監視先を付け替える
AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &defaultAddr, DispatchQueue.main) { _, _ in
    AudioObjectRemovePropertyListenerBlock(current, &runningAddr, DispatchQueue.main, onRunning)
    current = defaultInputDevice()
    AudioObjectAddPropertyListenerBlock(current, &runningAddr, DispatchQueue.main, onRunning)
    report()
}

report()
dispatchMain()
