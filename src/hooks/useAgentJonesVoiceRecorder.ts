import { useCallback, useRef, useState } from 'react'
import {
  AgentJonesTranscribeError,
  transcribeAgentJonesAudio,
} from '../lib/api/agentJonesTranscribe'

export type AgentJonesVoicePhase = 'idle' | 'recording' | 'transcribing'

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus'
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return 'audio/webm'
  }
  return null
}

export function useAgentJonesVoiceRecorder(): {
  phase: AgentJonesVoicePhase
  isSupported: boolean
  /** Hold to record; release to transcribe and resolve. */
  startRecording: () => Promise<void>
  stopRecordingAndTranscribe: () => Promise<string | null>
  cancelRecording: () => void
  lastError: string | null
} {
  const [phase, setPhase] = useState<AgentJonesVoicePhase>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const mimeRef = useRef<string>('audio/webm')

  const isSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined' &&
    pickMimeType() !== null

  const cancelRecording = useCallback(() => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null
    chunksRef.current = []
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        t.stop()
      }
      streamRef.current = null
    }
    setPhase('idle')
  }, [])

  const startRecording = useCallback(async () => {
    setLastError(null)
    const mime = pickMimeType()
    if (!mime) {
      setLastError('Voice recording is not supported in this browser.')
      return
    }
    cancelRecording()

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setLastError('Microphone permission denied or unavailable.')
      return
    }

    streamRef.current = stream
    mimeRef.current = mime
    chunksRef.current = []

    const rec = new MediaRecorder(stream, { mimeType: mime })
    recorderRef.current = rec

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    rec.onerror = () => {
      setLastError('Recording error.')
      cancelRecording()
    }

    rec.start(120)
    setPhase('recording')
  }, [cancelRecording])

  const stopRecordingAndTranscribe = useCallback(async (): Promise<
    string | null
  > => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') {
      cancelRecording()
      return null
    }

    return await new Promise((resolve) => {
      rec.onstop = async () => {
        recorderRef.current = null
        const stream = streamRef.current
        if (stream) {
          for (const t of stream.getTracks()) t.stop()
          streamRef.current = null
        }

        const parts = chunksRef.current
        chunksRef.current = []
        const blob = new Blob(parts, { type: mimeRef.current })

        if (blob.size < 200) {
          setPhase('idle')
          setLastError('Recording too short.')
          resolve(null)
          return
        }

        setPhase('transcribing')
        try {
          const text = await transcribeAgentJonesAudio(blob)
          setPhase('idle')
          resolve(text)
        } catch (e) {
          const msg =
            e instanceof AgentJonesTranscribeError
              ? e.message
              : 'Transcription failed.'
          setLastError(msg)
          setPhase('idle')
          resolve(null)
        }
      }
      try {
        rec.stop()
      } catch {
        cancelRecording()
        resolve(null)
      }
    })
  }, [cancelRecording])

  return {
    phase,
    isSupported,
    startRecording,
    stopRecordingAndTranscribe,
    cancelRecording,
    lastError,
  }
}
