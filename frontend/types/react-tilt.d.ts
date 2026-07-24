declare module 'react-tilt' {
  import * as React from 'react'

  export interface TiltProps extends React.HTMLAttributes<HTMLDivElement> {
    options?: {
      reverse?: boolean
      max?: number
      perspective?: number
      scale?: number
      speed?: number
      transition?: boolean
      axis?: 'x' | 'y' | null
      reset?: boolean
      easing?: string
    }
  }

  export class Tilt extends React.Component<TiltProps> {}
}
