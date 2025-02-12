import React from 'react'
import { keyCharacters } from './kedmanee.json'
import { fontData } from './generated/umpush.json'
import { lch2hex } from './Color'

export const settingsSchema = {
  theme: {
    default: 'dark',
    options: {
      light: 'Light theme',
      dark: 'Dark theme',
    },
  },
  keySplit: {
    default: 'none',
    options: {
      none: 'No split',
      index: 'Split at index finger',
      hand: 'Split between light and right hands',
    },
  },
  colorMode: {
    default: 'consonant',
    options: {
      none: 'No coloring',
      consonant: 'Color by consonant class',
      finger: 'Color by finger',
    },
  },
} as const

export type Settings = {
  [K in keyof typeof settingsSchema]: keyof typeof settingsSchema[K]['options']
}

export default function Keyboard({
  settings,
  extra,
  bg,
}: {
  settings: Partial<Settings>
  extra?: React.ReactNode
  bg?: boolean
}) {
  const appliedSettings: Settings = Object.fromEntries(
    Object.entries(settingsSchema).map(([key, value]) => {
      return [key, (settings as any)[key] || value.default]
    }),
  ) as any
  const keySplitter =
    keySplitterModes[appliedSettings.keySplit] ||
    keySplitterModes[settingsSchema.keySplit.default]
  const appearance = useAppearance(appliedSettings)
  const unitSizePts = 8
  const insetPts = 8
  let totalUnits = keyWidths[0].reduce((a, b) => a + b) + keySplitter.units
  const svgWidth = totalUnits * unitSizePts + 2 * insetPts
  const svgHeight = keyWidths.length * 4 * unitSizePts + 2 * insetPts
  const keyInsetPts = 2
  const background = appearance.getBackground()
  const textColor = appearance.getWebPageTextColor()

  React.useEffect(() => {
    document.body.style.backgroundColor = background
    document.body.style.color = textColor
  }, [background, textColor])

  return (
    <AppearanceContext.Provider value={appearance}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        {bg && (
          <rect
            x={0}
            y={0}
            width={svgWidth}
            height={svgHeight}
            fill={background}
            rx={8}
          />
        )}
        {extra}
        {keyWidths.map((widths, row) => {
          const y = insetPts + row * 4 * unitSizePts + keyInsetPts
          let currentUnits = 0
          return widths.map((widthUnits, column) => {
            currentUnits += keySplitter.marginLeft(row, column)
            widthUnits += keySplitter.grow(row, column)
            const x = insetPts + currentUnits * unitSizePts + keyInsetPts
            currentUnits += widthUnits
            const widthPts = widthUnits * unitSizePts - 2 * keyInsetPts
            const heightPts = 4 * unitSizePts - 2 * keyInsetPts
            const labels = keyCharacters[row]?.[column] as
              | KeyLabelsSpec
              | null
              | undefined
            return (
              <React.Fragment key={`${row}-${column}`}>
                <rect
                  x={x}
                  y={y}
                  width={widthPts}
                  height={heightPts}
                  rx={4}
                  stroke={appearance.getKeyStroke(row, column, labels)}
                  strokeWidth={1}
                  fill={appearance.getKeyFill(row, column, labels)}
                />
                {!!labels && (
                  <KeyLabels
                    row={row}
                    column={column}
                    x={x}
                    y={y}
                    width={widthPts}
                    height={heightPts}
                    labels={labels as any}
                  />
                )}
              </React.Fragment>
            )
          })
        })}
      </svg>
    </AppearanceContext.Provider>
  )
}

function KeyLabels({
  row,
  column,
  x,
  y,
  width,
  height,
  labels,
}: {
  row: number
  column: number
  x: number
  y: number
  width: number
  height: number
  labels: KeyLabelsSpec
}) {
  const appearance = React.useContext(AppearanceContext)
  if (!appearance) {
    throw new Error('AppearanceContext is required')
  }

  const hasAlt = false
  return (
    <g transform={`translate(${x}, ${y})`}>
      <KeyLabel
        x={width * (hasAlt ? 0.5 : 0.7)}
        y={height * 0.7}
        text={labels[0]}
        large
        fill={appearance.getLabelFill(row, column, labels[0], 'main')}
      />
      <KeyLabel
        x={width * 0.3}
        y={height * 0.3}
        text={labels[1]}
        fill={appearance.getLabelFill(row, column, labels[1], 'shift')}
      />
      <g opacity={0.5}>
        {/* <KeyLabel
          x={width * 0.7}
          y={height * 0.3}
          text={labels[2]}
          fill={appearance.getLabelFill(row, column, labels[2], 'alt')}
        /> */}
      </g>
    </g>
  )
}

function KeyLabel({
  x,
  y,
  text,
  fill,
  large,
}: {
  x: number
  y: number
  text: string
  fill: string
  large?: boolean
}) {
  const characters = []
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  {
    let cx = 0
    let i = 0
    for (const char of text) {
      if (i > 0) cx += 180
      const charData = (fontData as any)[char]
      if (charData) {
        characters.push([cx, charData])
        const width = charData.bounds[1][0] - charData.bounds[0][0]
        minX = Math.min(minX, cx + charData.bounds[0][0])
        minY = Math.min(minY, charData.bounds[0][1])
        maxX = Math.max(maxX, cx + charData.bounds[1][0])
        maxY = Math.max(maxY, charData.bounds[1][1])
        cx += width
      }
      i++
    }
  }
  const centerY = (minY + maxY) / 2
  let tx = -minX - (maxX - minX) / 2,
    ty =
      270 +
      (Math.max(centerY, -480) - centerY) +
      (Math.min(centerY, 0) - centerY)
  const scale = large ? 0.0125 : 0.01
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(${tx}, ${ty})`}
    >
      {characters.map(([cx, charData], i) => {
        return (
          <path
            key={i}
            d={charData.d}
            fill={fill}
            transform={`translate(${cx}, 0)`}
          />
        )
      })}
    </g>
  )
}

type KeyLabelsSpec = [string, string, string]

export interface IAppearance {
  getBackground(): string
  getWebPageTextColor(): string
  getKeyStroke(
    row: number,
    col: number,
    labels: KeyLabelsSpec | undefined | null,
  ): string
  getKeyFill(
    row: number,
    col: number,
    labels: KeyLabelsSpec | undefined | null,
  ): string
  getLabelFill(
    row: number,
    col: number,
    char: string,
    type: 'main' | 'shift' | 'alt',
  ): string
}

export const AppearanceContext = React.createContext<IAppearance | null>(null)

function useAppearance(settings: Settings): IAppearance {
  const theme = themes[settings.theme]
  const colorizer = colorizers[settings.colorMode]

  return {
    getBackground: () => theme.background,
    getWebPageTextColor: () => theme.labelFill,
    getKeyStroke: (row, column, labels) =>
      colorizer.getKeyStroke(theme, row, column, labels),
    getKeyFill: (row, column, labels) =>
      colorizer.getKeyFill(theme, row, column, labels),
    getLabelFill: (row, column, char, type) =>
      colorizer.getLabelFill(theme, row, column, char, type),
  }
}

export interface IKeySplitter {
  units: number
  marginLeft(row: number, column: number): number
  grow(row: number, column: number): number
}

const keySplitterModes: Record<Settings['keySplit'], IKeySplitter> = {
  none: {
    units: 0,
    marginLeft: () => 0,
    grow: () => 0,
  },
  hand: {
    units: 1,
    marginLeft: (row: number, column: number) => {
      return row < 4 ? (column === 6 ? 1 : 0) : 0
    },
    grow: (row: number, column: number) => {
      return row === 4 && column === 3 ? 1 : 0
    },
  },
  index: {
    units: 2,
    marginLeft: (row: number, column: number) => {
      return row < 4 ? (column === 5 || column === 7 ? 1 : 0) : 0
    },
    grow: (row: number, column: number) => {
      return row === 4 && column === 3 ? 2 : 0
    },
  },
}

export interface ITheme {
  background: string
  keyStroke: string
  keyFill: string
  keyColorChroma: number
  keyColorLuminance: number
  labelFill: string
  labelColorChroma: number
  labelColorLuminance: number
}

const themes: Record<Settings['theme'], ITheme> = {
  dark: {
    background: '#353433',
    keyStroke: '#656463',
    keyFill: 'none',
    keyColorChroma: 12,
    keyColorLuminance: 24,
    labelFill: '#eee',
    labelColorChroma: 64,
    labelColorLuminance: 84,
  },
  light: {
    background: '#eee',
    keyStroke: '#0004',
    keyFill: '#fff',
    keyColorChroma: 24,
    keyColorLuminance: 88,
    labelFill: '#000',
    labelColorChroma: 64,
    labelColorLuminance: 52,
  },
}

export interface IColorizer {
  getKeyStroke(
    theme: ITheme,
    row: number,
    column: number,
    labels: KeyLabelsSpec | undefined | null,
  ): string

  getKeyFill(
    theme: ITheme,
    row: number,
    column: number,
    labels: KeyLabelsSpec | undefined | null,
  ): string

  getLabelFill(
    theme: ITheme,
    row: number,
    column: number,
    char: string,
    type: 'main' | 'shift' | 'alt',
  ): string
}

const noneColorizer: IColorizer = {
  getKeyStroke: (theme) => theme.keyStroke,
  getKeyFill: (theme) => theme.keyFill,
  getLabelFill: (theme) => theme.labelFill,
}

const colorizers: Record<Settings['colorMode'], IColorizer> = {
  none: noneColorizer,
  consonant: {
    ...noneColorizer,
    getLabelFill: (theme, row, column, char, type) => {
      let hue = 0
      let chroma = theme.labelColorChroma
      let luminance = theme.labelColorLuminance
      if (char < 'ก' || char >= '๏') {
        return theme.labelFill
      } else if (char < 'จ') {
        hue = 0
      } else if (char < 'ฎ') {
        hue = 50
      } else if (char < 'ด') {
        hue = 100
      } else if (char < 'บ') {
        hue = 150
      } else if (char < 'ย') {
        hue = 200
      } else if (char < 'ฯ') {
        hue = 250
      } else {
        hue = 300
      }
      return lch2hex(luminance, chroma, hue)
    },
  },
  finger: {
    ...noneColorizer,
    getKeyFill: (theme, row, column) => {
      let hue = 0
      let chroma = theme.keyColorChroma
      let luminance = theme.keyColorLuminance
      if (row >= 4) {
        return theme.keyFill
      } else if (column < 2) {
        hue = 0
      } else if (column < 3) {
        hue = 60
      } else if (column < 4) {
        hue = 120
      } else if (column < 6) {
        hue = 160
      } else if (column < 8) {
        hue = 200
      } else if (column < 9) {
        hue = 240
      } else if (column < 10) {
        hue = 300
      } else {
        hue = 360
      }
      return lch2hex(luminance, chroma, hue)
    },
  },
}

const keyWidths = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 8],
  [6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6],
  [7, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9],
  [9, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 11],
  [6, 4, 6, 24, 6, 4, 4, 6],
]
