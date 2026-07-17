export type SettingsLeaveGuard = {
  sectionLabel: string
  save: () => Promise<boolean>
}
