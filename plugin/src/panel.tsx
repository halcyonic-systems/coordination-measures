// The channel-header button and its side panel: the channel you are in, measured in place.
import { React } from './host.ts'
import { ChannelView } from './channel-view.tsx'
import { useChannelData, useSession } from './hooks.ts'
import { Quiet } from './parts.tsx'
import type { Relay } from './read.ts'
import { t, useRoleColors } from './theme.ts'

type ChannelContext = { channelId: string; channelName: string }

/** Three linked marks: the plugin's sign, in the current text colour. */
export const Sign = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M5.2 6.2 7.2 10M10.8 6.2 8.8 10M6 4.5h4" strokeLinecap="round" />
    <circle cx="4" cy="4.5" r="2" />
    <circle cx="12" cy="4.5" r="2" />
    <path d="M8 9.6l2.1 1.2v2.4L8 14.4l-2.1-1.2v-2.4z" strokeLinejoin="round" />
  </svg>
)

export function Launcher({ context, pressed, toggle, available }: { context: ChannelContext; pressed: boolean; toggle: (target: string) => void; available: () => boolean }) {
  return (
    <button type="button" title="Coordination" aria-label="Show how this channel coordinates" aria-pressed={pressed} onClick={() => available() && toggle(context.channelId)}>
      <Sign />
    </button>
  )
}

export function ChannelPanel({ relay, channelContext }: { relay: Relay; channelContext?: ChannelContext }) {
  const session = useSession(relay)
  const colors = useRoleColors()
  const state = useChannelData(session, channelContext?.channelId)
  if (!channelContext) return <div style={{ padding: t.inset }}><Quiet>Open this from a channel to measure it.</Quiet></div>
  return (
    <div style={{ padding: t.inset, color: t.text, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <ChannelView name={channelContext.channelName} state={state} colors={colors} compact />
    </div>
  )
}
