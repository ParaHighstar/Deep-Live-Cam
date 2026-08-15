import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { AudioLines, Camera, CameraOff, Check, CircleHelp, Eye, EyeOff, ImagePlus, LoaderCircle, Mic, MicOff, Play, Radio, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react'
import { blink } from '@/blink/client'

const avatars = [
  { name: 'Nova', detail: 'Solar explorer', tone: 'from-amber-300 via-orange-400 to-rose-500', symbol: '✦' },
  { name: 'Moss', detail: 'Forest guardian', tone: 'from-emerald-300 via-teal-500 to-cyan-700', symbol: '❋' },
  { name: 'Orbit', detail: 'Cosmic host', tone: 'from-sky-300 via-indigo-500 to-violet-700', symbol: '◈' },
]

const effects = [
  { name: 'Aura wash', detail: 'soft color atmosphere', tone: 'from-amber-300/35 via-orange-500/20 to-transparent' },
  { name: 'Moon stage', detail: 'midnight studio light', tone: 'from-indigo-400/30 via-violet-500/20 to-transparent' },
  { name: 'Moss glow', detail: 'bioluminescent edges', tone: 'from-emerald-400/30 via-teal-500/20 to-transparent' },
]

const audioPresets = [
  { name: 'Studio clear', detail: 'warm, balanced voice', filter: 5200, delay: 0, drive: 0 },
  { name: 'Comet echo', detail: 'short creative echo', filter: 4200, delay: 0.16, drive: 0 },
  { name: 'Signal bloom', detail: 'soft radio texture', filter: 1800, delay: 0.04, drive: 0.28 },
]

const backgroundStyles = [
  { name: 'Moonlit observatory', detail: 'quiet cosmic depth', prompt: 'a fictional moonlit observatory with glass domes, soft indigo light, no people, cinematic live-call background' },
  { name: 'Moss cathedral', detail: 'lush bioluminescent world', prompt: 'a fictional bioluminescent forest cathedral, emerald moss, teal mist, no people, cinematic live-call background' },
  { name: 'Solar atelier', detail: 'warm creative studio', prompt: 'a fictional sunlit creative atelier with amber walls, art materials, warm shadows, no people, cinematic live-call background' },
]

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Mimic Studio · Responsible live effects' },
    { name: 'description', content: 'A consent-first live video effects studio with permanent disclosure.' },
  ] }),
  component: Studio,
})

function Studio() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioNodesRef = useRef<{ filter: BiquadFilterNode; delay: DelayNode; shaper: WaveShaperNode; gain: GainNode } | null>(null)
  const [selected, setSelected] = useState(0)
  const [effect, setEffect] = useState(0)
  const [audioPreset, setAudioPreset] = useState(0)
  const [backgroundStyle, setBackgroundStyle] = useState(0)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false)
  const [live, setLive] = useState(false)
  const [mic, setMic] = useState(true)
  const [camera, setCamera] = useState(true)
  const [showPreview, setShowPreview] = useState(true)
  const [status, setStatus] = useState('Ready to preview')
  const [participants, setParticipants] = useState([
    { name: 'You', avatar: 0, consented: true },
    { name: 'Guest Nova', avatar: 1, consented: false },
  ])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    void audioContextRef.current?.close()
  }, [])

  const applyAudioPreset = (index: number) => {
    setAudioPreset(index)
    const nodes = audioNodesRef.current
    const preset = audioPresets[index]
    if (!nodes) return
    nodes.filter.frequency.value = preset.filter
    nodes.delay.delayTime.value = preset.delay
    nodes.shaper.curve = createDriveCurve(preset.drive)
  }

  const generateBackground = async () => {
    setIsGeneratingBackground(true)
    setStatus('Generating a fictional background…')
    try {
      const { data } = await blink.ai.generateImage({
        prompt: `${backgroundStyles[backgroundStyle].prompt}. Leave the center area visually calm for a fictional avatar overlay. Do not depict real people, celebrities, logos, or recognizable private locations.`,
        model: 'fal-ai/nano-banana',
        n: 1,
        size: '1792x1024',
      })
      const url = data[0]?.url
      if (!url) throw new Error('The AI returned no background image')
      setBackgroundUrl(url)
      setStatus('AI background ready · fictional scene generated')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Background generation failed')
    } finally {
      setIsGeneratingBackground(false)
    }
  }

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const filter = audioContext.createBiquadFilter()
      const delay = audioContext.createDelay(0.5)
      const shaper = audioContext.createWaveShaper()
      const gain = audioContext.createGain()
      const destination = audioContext.createMediaStreamDestination()
      const preset = audioPresets[audioPreset]
      filter.type = 'lowpass'
      filter.frequency.value = preset.filter
      delay.delayTime.value = preset.delay
      shaper.curve = createDriveCurve(preset.drive)
      gain.gain.value = 0.85
      source.connect(filter).connect(shaper).connect(delay).connect(gain).connect(destination)
      const processedStream = new MediaStream([...stream.getVideoTracks(), ...destination.stream.getAudioTracks()])
      streamRef.current = stream
      audioContextRef.current = audioContext
      audioNodesRef.current = { filter, delay, shaper, gain }
      if (videoRef.current) {
        videoRef.current.srcObject = processedStream
        videoRef.current.muted = false
        await audioContext.resume()
        await videoRef.current.play()
      }
      setStatus('Camera and audio effects active')
    } catch {
      setStatus('Preview mode active · camera or microphone permission not granted')
    }
  }

  const toggleLive = () => {
    if (!live) { void startPreview(); setLive(true); setStatus('LIVE preview · fictional avatar enabled') }
    else { setLive(false); setStatus('Preview paused') }
  }

  const toggleCamera = () => {
    const next = !camera
    streamRef.current?.getVideoTracks().forEach(track => { track.enabled = next })
    setCamera(next)
  }

  const toggleMic = () => {
    const next = !mic
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = next })
    setMic(next)
  }

  const toggleConsent = (index: number) => {
    setParticipants(current => current.map((participant, participantIndex) => participantIndex === index
      ? { ...participant, consented: !participant.consented }
      : participant))
  }

  const addPerformer = () => {
    if (participants.length >= 3) {
      setStatus('Collaborative preview supports up to three fictional performers')
      return
    }
    setParticipants(current => [...current, { name: 'Guest Orbit', avatar: 2, consented: false }])
    setStatus('New performer added · consent required before preview')
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-border/70 pb-5">
        <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md"><WandSparkles size={18} /></div><div><p className="font-serif text-xl tracking-tight">Mimic Studio</p><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">consent-first live effects</p></div></div>
        <div className="hidden items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 text-xs text-accent-foreground sm:flex"><ShieldCheck size={14} /> disclosure always on</div>
        <button onClick={() => setStatus('Every preview stays clearly labeled as a fictional AI effect.')} className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Show safety information"><CircleHelp size={19} /></button>
      </header>

      <section className="mx-auto grid max-w-7xl gap-7 py-8 lg:grid-cols-[1fr_360px] lg:py-12">
        <div>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">live effects playground</p><h1 className="max-w-2xl font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">Perform as a character, not a person.</h1></div><p className="max-w-xs text-sm leading-6 text-muted-foreground">Create playful live moments with fictional avatars. Every broadcast carries a visible AI-effects disclosure.</p></div>
          <div className="relative aspect-video overflow-hidden rounded-[1.5rem] border border-border bg-[radial-gradient(circle_at_50%_35%,oklch(0.28_0.08_75),transparent_25%),linear-gradient(135deg,oklch(0.2_0.05_255),oklch(0.12_0.02_254))] shadow-lg">
            {backgroundUrl && <img src={backgroundUrl} alt={`AI-generated fictional ${backgroundStyles[backgroundStyle].name} background`} className="absolute inset-0 size-full object-cover opacity-70" />}
            {showPreview && <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 size-full object-cover opacity-45" />}
            <div className={`absolute inset-0 bg-gradient-to-br ${avatars[selected].tone} ${effects[effect].tone} opacity-40 mix-blend-screen transition-all duration-500`} />
            <div className="absolute inset-0 grid place-items-center"><div className="text-center"><div className={`mx-auto mb-4 grid size-28 place-items-center rounded-full border-2 border-primary/70 bg-background/25 text-6xl shadow-lg backdrop-blur-sm transition-transform duration-500 ${live ? 'scale-105' : ''}`}>{avatars[selected].symbol}</div><p className="font-serif text-3xl">{avatars[selected].name}</p><p className="text-sm text-foreground/70">{avatars[selected].detail} · {effects[effect].name}</p></div></div>
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest backdrop-blur"><span className={`size-2 rounded-full ${live ? 'animate-pulse bg-destructive' : 'bg-muted-foreground'}`} />{live ? 'collab preview' : 'standby'}</div>
            <div className="absolute bottom-4 left-4 rounded-md border border-primary/50 bg-background/90 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.13em] text-primary backdrop-blur">AI EFFECT · FICTIONAL AVATARS · CONSENT REQUIRED</div>
            <div className="absolute bottom-4 right-4 rounded-full bg-background/70 px-3 py-1.5 text-xs text-foreground/80 backdrop-blur">{status}</div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><button onClick={toggleCamera} className="grid size-11 place-items-center rounded-full border border-border bg-secondary transition hover:-translate-y-0.5 hover:border-primary" aria-label={camera ? 'Turn camera off' : 'Turn camera on'}>{camera ? <Camera size={18} /> : <CameraOff size={18} />}</button><button onClick={toggleMic} className="grid size-11 place-items-center rounded-full border border-border bg-secondary transition hover:-translate-y-0.5 hover:border-primary" aria-label={mic ? 'Mute microphone' : 'Unmute microphone'}>{mic ? <Mic size={18} /> : <MicOff size={18} />}</button><button onClick={() => setShowPreview(value => !value)} className="grid size-11 place-items-center rounded-full border border-border bg-secondary transition hover:-translate-y-0.5 hover:border-primary" aria-label={showPreview ? 'Hide camera preview' : 'Show camera preview'}>{showPreview ? <Eye size={18} /> : <EyeOff size={18} />}</button></div><button onClick={toggleLive} className={`inline-block rounded-full px-6 py-3 text-left text-sm font-semibold transition hover:-translate-y-0.5 active:translate-y-0 ${live ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>{live ? <Radio className="mr-2 inline-block" size={16} /> : <Play className="mr-2 inline-block" size={16} />}{live ? 'Stop preview' : 'Start preview'}</button></div>
        </div>

        <aside className="rounded-[1.5rem] border border-border bg-card p-5 shadow-md"><div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">creative controls</p><h2 className="mt-1 font-serif text-2xl">Build your scene</h2></div><Sparkles className="text-primary" size={20} /></div><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">fictional persona</p><div className="space-y-3">{avatars.map((avatar, index) => <button key={avatar.name} onClick={() => setSelected(index)} className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${selected === index ? 'border-primary bg-primary/10' : 'border-border bg-secondary/45 hover:border-primary/50'}`}><div className={`grid size-14 place-items-center rounded-xl bg-gradient-to-br ${avatar.tone} text-2xl text-foreground shadow-sm`}>{avatar.symbol}</div><div className="min-w-0 flex-1"><p className="font-semibold">{avatar.name}</p><p className="text-xs text-muted-foreground">{avatar.detail}</p></div>{selected === index && <Check className="text-primary" size={18} />}</button>)}</div><p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">visual treatment</p><div className="grid grid-cols-3 gap-2">{effects.map((item, index) => <button key={item.name} onClick={() => setEffect(index)} className={`rounded-xl border p-2 text-left transition hover:-translate-y-0.5 ${effect === index ? 'border-primary bg-primary/10' : 'border-border bg-secondary/45 hover:border-primary/50'}`}><div className={`mb-2 h-10 rounded-lg bg-gradient-to-br ${item.tone}`} /><p className="text-xs font-semibold leading-tight">{item.name}</p><p className="mt-1 text-[10px] leading-tight text-muted-foreground">{item.detail}</p></button>)}</div><p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">audio treatment</p><div className="grid grid-cols-3 gap-2">{audioPresets.map((preset, index) => <button key={preset.name} onClick={() => applyAudioPreset(index)} className={`rounded-xl border p-2 text-left transition hover:-translate-y-0.5 ${audioPreset === index ? 'border-primary bg-primary/10' : 'border-border bg-secondary/45 hover:border-primary/50'}`}><AudioLines className="mb-2 text-primary" size={16} /><p className="text-xs font-semibold leading-tight">{preset.name}</p><p className="mt-1 text-[10px] leading-tight text-muted-foreground">{preset.detail}</p></button>)}</div><p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI background</p><div className="grid grid-cols-3 gap-2">{backgroundStyles.map((style, index) => <button key={style.name} onClick={() => setBackgroundStyle(index)} className={`rounded-xl border p-2 text-left transition hover:-translate-y-0.5 ${backgroundStyle === index ? 'border-primary bg-primary/10' : 'border-border bg-secondary/45 hover:border-primary/50'}`}><ImagePlus className="mb-2 text-primary" size={16} /><p className="text-xs font-semibold leading-tight">{style.name}</p><p className="mt-1 text-[10px] leading-tight text-muted-foreground">{style.detail}</p></button>)}</div><button onClick={generateBackground} disabled={isGeneratingBackground} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-left text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{isGeneratingBackground ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}{isGeneratingBackground ? 'Generating background…' : 'Generate AI background'}</button><p className="mt-2 text-[10px] leading-4 text-muted-foreground">Fictional scenery only. Generated backgrounds exclude people, private locations, and recognizable brands.</p><p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">collaborative performers</p><div className="space-y-2">{participants.map((participant, index) => <div key={`${participant.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/45 p-3"><div className={`grid size-10 place-items-center rounded-lg bg-gradient-to-br ${avatars[participant.avatar].tone} text-lg`}>{avatars[participant.avatar].symbol}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{participant.name}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{participant.consented ? 'consent confirmed' : 'waiting for consent'}</p></div><button onClick={() => toggleConsent(index)} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${participant.consented ? 'bg-accent/20 text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>{participant.consented ? 'Consented' : 'Confirm consent'}</button></div>)}</div><button onClick={addPerformer} className="mt-3 inline-block w-full rounded-xl border border-border px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-primary hover:text-foreground">+ Add fictional performer</button><div className="mt-6 border-t border-border pt-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-accent" size={18} /><p className="text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Safety lock active.</span> This studio only uses fictional characters. Every performer must confirm consent, and the disclosure watermark is permanently visible on collaborative previews.</p></div><button onClick={() => setStatus('Profile and fictional avatar preferences are ready to customize.')} className="mt-4 inline-block w-full rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold transition hover:border-primary hover:bg-primary/10">PROFILE AND AVATAR SETTINGS</button></div></aside>
      </section>
    </main>
  )
}

function createDriveCurve(amount: number) {
  if (amount === 0) return null
  const curve = new Float32Array(256)
  for (let index = 0; index < curve.length; index += 1) {
    const x = (index * 2) / curve.length - 1
    curve[index] = ((3 + amount * 18) * x * 20 * Math.PI / 180) / (Math.PI + amount * 18 * Math.abs(x))
  }
  return curve
}