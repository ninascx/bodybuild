import { useCallback, useEffect, useRef, useState } from 'react'

function playRestCompleteSound() {
  try {
    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
    const AudioContextCtor = window.AudioContext ?? audioWindow.webkitAudioContext
    if (!AudioContextCtor) return
    const audioContext = new AudioContextCtor()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch {
    // Fallback: silent if audio not supported
  }
}

function vibrateDevice() {
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200])
  }
}

export function useTrainingTimer(selectedDate: string, active: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    try {
      const key = `bodybuild:elapsed:${selectedDate}`
      const saved = localStorage.getItem(key)
      return saved ? Number(saved) || 0 : 0
    } catch {
      return 0
    }
  })
  const [restSeconds, setRestSeconds] = useState(90)
  const [restActive, setRestActive] = useState(false)
  const [restDefaultDuration, setRestDefaultDuration] = useState(() => {
    try {
      const saved = localStorage.getItem('bodybuild:restDuration')
      const parsed = Number(saved)
      return Number.isFinite(parsed) && parsed >= 15 && parsed <= 300 ? parsed : 90
    } catch {
      return 90
    }
  })
  const [autoStartRest, setAutoStartRest] = useState(() => {
    try {
      const saved = localStorage.getItem('bodybuild:autoStartRest')
      return saved === 'true'
    } catch {
      return false
    }
  })

  const restIntervalRef = useRef<number | null>(null)
  const elapsedIntervalRef = useRef<number | null>(null)
  const lastWorkoutDateRef = useRef<string | null>(null)
  const prevRestSecondsRef = useRef(restSeconds)

  const startRestTimer = useCallback(() => {
    setRestSeconds(restDefaultDuration)
    setRestActive(true)
  }, [restDefaultDuration])

  const stopRestTimer = useCallback(() => {
    setRestActive(false)
    if (restIntervalRef.current !== null) {
      window.clearInterval(restIntervalRef.current)
      restIntervalRef.current = null
    }
  }, [])

  const adjustRestDuration = useCallback((delta: number) => {
    setRestDefaultDuration((prev) => Math.min(300, Math.max(15, prev + delta)))
    setRestSeconds((prev) => Math.min(300, Math.max(0, prev + delta)))
  }, [])

  const toggleAutoStartRest = useCallback(() => {
    setAutoStartRest((prev) => {
      const next = !prev
      try {
        localStorage.setItem('bodybuild:autoStartRest', String(next))
      } catch { /* ignore */ }
      return next
    })
  }, [])

  useEffect(() => {
    const isNewWorkout = lastWorkoutDateRef.current !== selectedDate
    if (isNewWorkout) {
      let nextElapsed = 0
      try {
        const key = `bodybuild:elapsed:${selectedDate}`
        const saved = localStorage.getItem(key)
        nextElapsed = saved ? Number(saved) || 0 : 0
      } catch { /* ignore */ }
      lastWorkoutDateRef.current = selectedDate
      const timer = window.setTimeout(() => setElapsedSeconds(nextElapsed), 0)
      return () => window.clearTimeout(timer)
    }
  }, [selectedDate])

  useEffect(() => {
    try {
      const key = `bodybuild:elapsed:${selectedDate}`
      localStorage.setItem(key, String(elapsedSeconds))
    } catch { /* ignore */ }
  }, [elapsedSeconds, selectedDate])

  useEffect(() => {
    if (restActive && prevRestSecondsRef.current === 1 && restSeconds === 0) {
      playRestCompleteSound()
      vibrateDevice()
    }
    prevRestSecondsRef.current = restSeconds
  }, [restSeconds, restActive])

  useEffect(() => {
    if (!active) {
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current)
        elapsedIntervalRef.current = null
      }
      return
    }

    elapsedIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => {
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current)
      }
    }
  }, [active])

  useEffect(() => {
    if (restActive && restSeconds > 0) {
      restIntervalRef.current = window.setInterval(() => {
        setRestSeconds((prev) => (prev <= 1 ? 0 : prev - 1))
      }, 1000)
    }
    return () => {
      if (restIntervalRef.current !== null) {
        window.clearInterval(restIntervalRef.current)
      }
    }
  }, [restActive, restSeconds])

  useEffect(() => {
    try {
      localStorage.setItem('bodybuild:restDuration', String(restDefaultDuration))
    } catch { /* ignore */ }
  }, [restDefaultDuration])

  return {
    elapsedSeconds,
    restSeconds,
    restActive,
    restDefaultDuration,
    autoStartRest,
    startRestTimer,
    stopRestTimer,
    adjustRestDuration,
    toggleAutoStartRest,
  }
}
