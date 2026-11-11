// The host's React, set once in apply(). Every .tsx file imports it, so classic JSX
// (React.createElement) runs against the app's own React, never a bundled copy.
import type * as ReactNS from 'react'

export let React: typeof ReactNS
export const setReact = (r: typeof ReactNS) => {
  React = r
}
