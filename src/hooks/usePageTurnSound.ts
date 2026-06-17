import { useCallback, useRef } from 'react'

const PAGE_TURN_VOLUME = 0.2

let sharedContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext()
  }
  return sharedContext
}

function synthesizePageTurn(ctx: AudioContext) {
  const duration = 0.18
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / length
    const envelope = Math.pow(1 - t, 1.8)
    data[i] = (Math.random() * 2 - 1) * envelope
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.setValueAtTime(1200, ctx.currentTime)
  bandpass.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + duration)
  bandpass.Q.value = 0.7

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = 300

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(PAGE_TURN_VOLUME * 0.35, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  noise.connect(bandpass)
  bandpass.connect(highpass)
  highpass.connect(gain)
  gain.connect(ctx.destination)

  noise.start()
  noise.stop(ctx.currentTime + duration)
}

export function usePageTurnSound(enabled: boolean) {
  const lastPlayed = useRef(0)

  const play = useCallback(() => {
    if (!enabled) return

    const now = Date.now()
    if (now - lastPlayed.current < 120) return
    lastPlayed.current = now

    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    synthesizePageTurn(ctx)
  }, [enabled])

  const unlock = useCallback(() => {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }
  }, [])

  return { play, unlock }
}
