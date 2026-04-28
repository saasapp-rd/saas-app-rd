import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        saas: {
          red:       '#A6192E',
          'red-athletic': '#CE2033',
          'red-dark': '#810D1E',
          grey:      '#3D3D3D',
          'grey-light': '#EAEAEA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
