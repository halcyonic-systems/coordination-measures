// React hooks over read.ts: the current session, its channel list, and one channel's data kept current.
import { React } from './host.ts'
import { measurable, readChannel, type Channel, type ChannelData, type Relay, type Session } from './read.ts'

/** The ready session, or undefined while Buzz connects. Rebinds when the session is replaced. */
export function useSession(relay: Relay): Session | undefined {
  const [snap, setSnap] = React.useState(() => relay.snapshot())
  React.useEffect(() => relay.subscribe(() => setSnap(relay.snapshot())), [relay])
  return snap.status === 'ready' ? snap.session : undefined
}

/** The joined channels worth measuring. `supported` is false on a host whose session cannot list channels. */
export function useChannels(session: Session | undefined): { channels: Channel[]; supported: boolean } {
  const [channels, setChannels] = React.useState<Channel[]>([])
  const supported = !session || typeof session.channels?.list === 'function'
  React.useEffect(() => {
    if (!session || !supported) return setChannels([])
    const update = () => {
      try {
        setChannels(measurable(session.channels.list().channels ?? []))
      } catch {
        setChannels([])
      }
    }
    update()
    return session.channels.subscribeList?.(update)
  }, [session, supported])
  return { channels, supported }
}

export type ChannelState = { status: 'idle' | 'reading' | 'ready' | 'error'; data?: ChannelData; error?: string; readAt?: number; live: boolean }

/** How long to wait after a new message before reading again, so a burst costs one read. */
const SETTLE_MS = 1500

/**
 * One channel's data. Reads when the channel is chosen, on `refresh()`, and again shortly after
 * Buzz reports a new message in it. The last good data stays on screen while a new read runs.
 */
export function useChannelData(session: Session | undefined, channelId: string | undefined): ChannelState & { refresh: () => void } {
  const [state, setState] = React.useState<ChannelState>({ status: 'idle', live: false })
  const [tick, setTick] = React.useState(0)
  const refresh = React.useCallback(() => setTick((n) => n + 1), [])

  React.useEffect(() => setState({ status: 'idle', live: false }), [session, channelId])

  React.useEffect(() => {
    if (!session || !channelId) return
    const abort = new AbortController()
    setState((s) => ({ ...s, status: s.data ? s.status : 'reading' }))
    readChannel(session, channelId, abort.signal)
      .then((data) => setState((s) => ({ ...s, status: 'ready', data, error: undefined, readAt: Date.now() })))
      .catch((e) => !abort.signal.aborted && setState((s) => ({ ...s, status: 'error', error: String(e?.message ?? e) })))
    return () => abort.abort()
  }, [session, channelId, tick])

  React.useEffect(() => {
    if (!session?.subscribeIncoming || !channelId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = session.subscribeIncoming((messages) => {
      if (!messages.some((m) => m.channelId === channelId)) return
      clearTimeout(timer)
      timer = setTimeout(refresh, SETTLE_MS)
    })
    setState((s) => ({ ...s, live: true }))
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [session, channelId, refresh])

  return { ...state, refresh }
}
