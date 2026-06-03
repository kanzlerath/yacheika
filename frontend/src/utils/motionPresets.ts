export const appEase = [0.22, 1, 0.36, 1] as const;

export const panelTransition = {
  duration: 0.28,
  ease: appEase,
};

export const softTransition = {
  duration: 0.2,
  ease: appEase,
};

export const contentSwitch = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: softTransition,
};

export const revealList = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
};

export const revealItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: softTransition,
  },
};
