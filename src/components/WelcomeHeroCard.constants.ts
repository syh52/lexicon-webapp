// WelcomeHeroCard 组件的常量定义文件

export type AnimationDelay = 0 | 100 | 200 | 300 | 400 | 500;

export const ANIMATION_DELAYS: Record<AnimationDelay, string> = {
  0: 'animate-delay-0',
  100: 'animate-delay-100',
  200: 'animate-delay-200',
  300: 'animate-delay-300',
  400: 'animate-delay-400',
  500: 'animate-delay-500'
};

export const STYLES = {
  container: `
    relative w-full max-w-2xl mx-auto
    px-4 sm:px-6 md:px-8
    bg-gradient-to-br from-purple-500/20 to-blue-500/20
    backdrop-blur-xl rounded-3xl
    shadow-2xl
    p-8 sm:p-10 md:p-12
    transition-all duration-300
    hover:shadow-2xl hover:scale-[1.02]
    active:scale-[0.98]
  `,
  backgroundLayer: `
    absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-3xl
  `,
  cardContainer: `
    relative z-10
  `,
  contentCenter: `
    text-center
  `,
  content: `
    relative z-10 text-center
    space-y-3 sm:space-y-4
  `,
  subtitle: `
    text-sm sm:text-base
    font-light tracking-wide
    text-purple-300/90
    uppercase
    mb-3 sm:mb-4
  `,
  title: `
    text-2xl sm:text-3xl md:text-4xl
    font-bold bg-gradient-to-r
    from-white to-gray-200
    bg-clip-text text-transparent
    leading-tight
    mb-4 sm:mb-6
  `,
  description: `
    text-base sm:text-lg
    text-gray-300/80
    font-light
    leading-relaxed
    max-w-xl mx-auto
    mb-6 sm:mb-8
  `,
  button: `
    inline-flex items-center justify-center
    px-6 py-3 sm:px-8 sm:py-4
    bg-gradient-to-r from-purple-500 to-blue-500
    text-white font-medium
    rounded-2xl shadow-lg
    transition-all duration-300
    hover:from-purple-600 hover:to-blue-600
    hover:shadow-xl hover:scale-105
    active:scale-95
    focus:outline-none focus:ring-2 focus:ring-purple-500/50
  `,
  buttonContainer: `
    flex justify-center
  `,
  animation: {
    base: `animate-blur-in`
  }
};

export const DEFAULT_VALUES = {
  subtitle: '',
  buttonText: '开始使用',
  showButton: true,
  className: '',
  enableAnimation: true,
  animationDelay: 200 as AnimationDelay
}; 