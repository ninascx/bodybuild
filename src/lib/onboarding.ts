export type CoachMarkStep = {
  target: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export const workoutOnboardingSteps: CoachMarkStep[] = [
  {
    target: '[data-coach="workout-input"]',
    title: '输入重量和次数',
    description: '填写本组的重量和完成的次数。支持小数（如 52.5kg）。',
    placement: 'top'
  },
  {
    target: '[data-coach="rir-selector"]',
    title: '选择 RIR',
    description: 'RIR = Reps in Reserve，表示完成后还能做几次。0 表示力竭，3 表示还能做 3 次。',
    placement: 'top'
  },
  {
    target: '[data-coach="complete-set"]',
    title: '完成本组',
    description: '填写完毕后点击完成。如果误操作，可以在 5 秒内点击"撤销"按钮恢复。',
    placement: 'top'
  },
  {
    target: '[data-coach="rest-timer"]',
    title: '组间休息',
    description: '完成一组后可以开始休息计时。支持 -15s、+15s、+30s 快速调整。',
    placement: 'top'
  },
  {
    target: '[data-coach="keyboard-shortcuts"]',
    title: '键盘快捷键',
    description: '支持 Enter 完成组、Space 开始休息、← 上一个、→ 下一个。鼠标悬停按钮可查看快捷键。',
    placement: 'bottom'
  }
]

export const dailyOnboardingSteps: CoachMarkStep[] = [
  {
    target: '[data-coach="daily-essentials"]',
    title: '每日记录',
    description: '优先填写体重、热量和蛋白质。这些数据会自动保存和同步。',
    placement: 'bottom'
  },
  {
    target: '[data-coach="copy-yesterday"]',
    title: '快速填充',
    description: '点击"复制昨天"可以一键填入昨天的数据，再微调即可。快捷键 Ctrl+Y。',
    placement: 'top'
  },
  {
    target: '[data-coach="fill-target"]',
    title: '填入目标',
    description: '如果设置了目标值，可以一键填入目标。快捷键 Ctrl+T。',
    placement: 'top'
  }
]
