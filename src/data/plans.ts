import type { DailyTarget, DayKey, UserProfile, WorkoutPlan, WorkoutTemplate } from '../types'

export const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

export const userProfile: UserProfile = {
  sex: 'male',
  birthDate: '2002-11-10',
  heightCm: 174,
  initialWeightKg: 80,
  estimatedBodyFatPercent: 18,
  targetWeeks: '8-12 周',
  goal: '减脂过程中尽量增肌，重点提升胸肌视觉效果，同时保护肩部',
  sleepHours: 7,
  averageSteps: 6500,
  trainingDays: [0, 1, 2, 3, 4],
}

const weekendNotes = [
  '允许自由饮食，但不要全天零食化进食。',
  '额外热量优先来自碳水，不要主要来自高脂零食、油炸、甜品和酒精。',
]

export const dailyTargets: Record<DayKey, DailyTarget> = {
  0: {
    day: 0,
    dayName: '周日',
    workoutName: '推 A',
    calories: 2100,
    protein: 170,
    carbs: 220,
    fat: 60,
    stepTarget: 6500,
    notes: ['胸部主刺激日，卧推保留 1-2 次余力。'],
    isTrainingDay: true,
  },
  1: {
    day: 1,
    dayName: '周一',
    workoutName: '拉 A',
    calories: 2100,
    protein: 170,
    carbs: 220,
    fat: 60,
    stepTarget: 6500,
    notes: ['背阔和后束为主，划船保持肩胛稳定。'],
    isTrainingDay: true,
  },
  2: {
    day: 2,
    dayName: '周二',
    workoutName: '腿',
    calories: 2200,
    protein: 170,
    carbs: 245,
    fat: 60,
    stepTarget: 6500,
    notes: ['完整下肢日，主项前保证热身充分。'],
    isTrainingDay: true,
  },
  3: {
    day: 3,
    dayName: '周三',
    workoutName: '推 B',
    calories: 2050,
    protein: 170,
    carbs: 207,
    fat: 60,
    stepTarget: 6500,
    notes: ['上胸与胸型日，推举动作仅在无不适时保留。'],
    isTrainingDay: true,
  },
  4: {
    day: 4,
    dayName: '周四',
    workoutName: '拉 B + 腿部补量',
    calories: 2050,
    protein: 170,
    carbs: 207,
    fat: 60,
    stepTarget: 6500,
    notes: ['拉 B 加腿部补量，避免把补量做成第二个腿日。'],
    isTrainingDay: true,
  },
  5: {
    day: 5,
    dayName: '周五',
    workoutName: '休息 / 自由饮食',
    calorieRange: [2600, 3000],
    protein: 160,
    stepTarget: 8000,
    notes: weekendNotes,
    isTrainingDay: false,
  },
  6: {
    day: 6,
    dayName: '周六',
    workoutName: '休息 / 自由饮食',
    calorieRange: [2600, 3000],
    protein: 160,
    stepTarget: 8000,
    notes: weekendNotes,
    isTrainingDay: false,
  },
}

export const weeklyCalorieTarget = 16000

/** 周末规则阈值，用于"周末规则检查"等显示性判断（非硬性目标）。 */
export const weekendRules = {
  /** 单日热量上限：超过即视为周末偏高。与 calorieRange 上限保持一致以便集中维护。 */
  caloriesUpperKcal: 3000,
  /** 单日蛋白质下限。低于即标 warning。 */
  proteinMinG: 160,
  /** 单日步数下限。低于即标 warning。 */
  stepsMinSteps: 8000,
}

export const shoulderProtectionTips = [
  '推举不追疼痛，优先选择可控、稳定、无明显不适的动作。',
  '胸推动作优先器械或中立握，必要时缩小动作范围。',
  '睡眠不足或疲劳高时，训练保留更多余力，不冲力竭。',
  '如果出现夜间痛醒、麻木、明显无力或疼痛持续加重，应停止相关训练并就医。',
]

export const workoutPlans: Record<DayKey, WorkoutPlan> = {
  0: {
    day: 0,
    name: '推 A',
    focus: '胸部主刺激',
    exercises: [
      { id: 'bench-press', name: '杠铃卧推', prescription: '4 组 × 5-8 次', note: '保留 1-2 次余力' },
      { id: 'low-incline-press', name: '低上斜哑铃或器械卧推', prescription: '3 组 × 6-10 次', note: '倾角 15-30°，肩不舒服就换器械中立握' },
      { id: 'cable-fly', name: '绳索夹胸或飞鸟', prescription: '2 组 × 12-15 次' },
      { id: 'lateral-raise-a', name: '侧平举', prescription: '3 组 × 12-20 次' },
      { id: 'triceps-pushdown', name: '绳索下压', prescription: '2 组 × 10-15 次' },
      { id: 'face-pull-a', name: '面拉或外旋', prescription: '2 组 × 12-20 次' },
    ],
  },
  1: {
    day: 1,
    name: '拉 A',
    focus: '背阔 + 后束',
    exercises: [
      { id: 'neutral-pulldown', name: '中立握下拉 / 引体', prescription: '4 组 × 6-10 次' },
      { id: 'chest-supported-row', name: '胸托划船', prescription: '3 组 × 8-12 次' },
      { id: 'single-arm-cable-pulldown', name: '单臂钢线下拉', prescription: '2 组 × 10-15 次' },
      { id: 'rear-delt-fly-a', name: '反向飞鸟 / 后束钢线', prescription: '3 组 × 12-20 次' },
      { id: 'curl-a', name: '弯举', prescription: '3 组 × 8-12 次' },
      { id: 'y-raise', name: '低斜方或 Y raise', prescription: '2 组 × 12-15 次' },
    ],
  },
  2: {
    day: 2,
    name: '腿',
    focus: '完整下肢',
    exercises: [
      { id: 'squat-variant', name: '前蹲 / 哈克深蹲 / 史密斯深蹲', prescription: '4 组 × 5-8 次' },
      { id: 'romanian-deadlift', name: '罗马尼亚硬拉', prescription: '3 组 × 6-10 次' },
      { id: 'split-squat-or-leg-press', name: '保加利亚分腿蹲或腿举', prescription: '3 组 × 8-12 次' },
      { id: 'leg-curl-a', name: '腿弯举', prescription: '3 组 × 10-15 次' },
      { id: 'back-extension-or-hip-thrust', name: '山羊挺身或臀推', prescription: '2 组 × 8-12 次' },
      { id: 'calf-raise-a', name: '小腿提踵', prescription: '3 组 × 10-15 次' },
    ],
  },
  3: {
    day: 3,
    name: '推 B',
    focus: '上胸与胸型',
    exercises: [
      { id: 'machine-chest-press', name: '中立握器械胸推 / 低上斜史密斯', prescription: '3 组 × 8-12 次' },
      { id: 'push-up-variant', name: '把手俯卧撑 / 负重俯卧撑 / 平板器械胸推', prescription: '2 组 × 10-15 次' },
      { id: 'low-to-high-fly', name: '低到高绳索飞鸟', prescription: '3 组 × 12-15 次' },
      { id: 'landmine-press', name: '地雷管推举', prescription: '2 组 × 8-12 次', note: '仅无痛时保留' },
      { id: 'lateral-raise-b', name: '侧平举', prescription: '3 组 × 12-20 次' },
      { id: 'overhead-cable-extension', name: '过顶绳索臂屈伸', prescription: '2 组 × 12-15 次' },
    ],
  },
  4: {
    day: 4,
    name: '拉 B + 腿部补量',
    focus: '背部 + 下肢补量',
    exercises: [
      { id: 'seated-row', name: '坐姿划船', prescription: '3 组 × 8-12 次' },
      { id: 'pulldown-or-straight-arm', name: '下拉或直臂下压', prescription: '3 组 × 10-12 次' },
      { id: 'single-arm-machine-row', name: '单臂器械划船', prescription: '2 组 × 10-12 次' },
      { id: 'rear-delt-fly-b', name: '后束飞鸟', prescription: '3 组 × 12-20 次' },
      { id: 'hammer-curl', name: '锤式弯举', prescription: '2-3 组 × 10-12 次' },
      { id: 'leg-extension', name: '腿伸', prescription: '2 组 × 12-15 次' },
      { id: 'leg-curl-or-calf', name: '腿弯举或小腿', prescription: '2 组 × 12-15 次' },
    ],
  },
  5: {
    day: 5,
    name: '休息 / 自由饮食',
    focus: '恢复与活动量',
    exercises: [
      { id: 'protein-floor-fri', name: '蛋白质达标', prescription: '至少 160 g' },
      { id: 'free-meal-control-fri', name: '控制自由饮食', prescription: '尽量不超过 3000 kcal' },
      { id: 'steps-fri', name: '步数', prescription: '至少 8000 步' },
      { id: 'walk-fri', name: '饭后步行', prescription: '20-30 分钟' },
    ],
  },
  6: {
    day: 6,
    name: '休息 / 自由饮食',
    focus: '恢复与活动量',
    exercises: [
      { id: 'protein-floor-sat', name: '蛋白质达标', prescription: '至少 160 g' },
      { id: 'free-meal-control-sat', name: '控制自由饮食', prescription: '尽量不超过 3000 kcal' },
      { id: 'steps-sat', name: '步数', prescription: '至少 8000 步' },
      { id: 'walk-sat', name: '饭后步行', prescription: '20-30 分钟' },
    ],
  },
}

export function getBuiltinTemplates(): WorkoutTemplate[] {
  const now = new Date().toISOString()
  return Object.values(workoutPlans).map((plan) => ({
    id: `builtin-${plan.day}`,
    name: plan.name,
    focus: plan.focus,
    category: '内置计划',
    exercises: plan.exercises,
    createdAt: now,
    updatedAt: now,
    isBuiltin: true,
  }))
}
