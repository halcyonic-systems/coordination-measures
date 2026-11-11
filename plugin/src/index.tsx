// Registers the plugin's two surfaces: the Coordination page and the channel-header panel.
// All work happens in apply(); nothing runs when the module is loaded.
import { React, setReact } from './host.ts'
import { CoordinationPage } from './page.tsx'
import { ChannelPanel, Launcher } from './panel.tsx'
import type { Relay } from './read.ts'

export const inject = ['react', 'pages', 'panels', 'relay']

const ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4c566a" stroke-width="1.4"><path d="M5.2 6.2 7.2 10M10.8 6.2 8.8 10M6 4.5h4" stroke-linecap="round"/><circle cx="4" cy="4.5" r="2"/><circle cx="12" cy="4.5" r="2"/><path d="M8 9.6l2.1 1.2v2.4L8 14.4l-2.1-1.2v-2.4z" stroke-linejoin="round"/></svg>',
  )

type Host = {
  react: typeof React
  relay: Relay
  pages: { register: (page: object) => void }
  panels: { register: (panel: object) => void }
}

export function apply(ctx: Host) {
  setReact(ctx.react)
  ctx.pages.register({
    id: 'coordination',
    title: 'Coordination',
    primary: true,
    placement: 'topbar', // the app's main navigation; newer hosts call it the dock and accept this name
    icon: ICON,
    component: () => <CoordinationPage relay={ctx.relay} />,
  })
  ctx.panels.register({
    id: 'channel',
    title: 'Coordination',
    matches: () => false, // opened only from the channel header, never by a link
    channelLauncher: Launcher,
    channelPlacement: 'side',
    component: (props: { channelContext?: { channelId: string; channelName: string } }) => <ChannelPanel relay={ctx.relay} channelContext={props.channelContext} />,
  })
}
