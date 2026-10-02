import { CHARACTER_SECTIONS } from './schemas'

/** The non-schema History tab, spliced after Narrative. */
export const HISTORY_TAB = {
  id: 'history',
  icon: 'Milestone',
  label: 'History',
  description: 'Formative events, in order. Each one explains something on the sheet.',
  custom: true,
}

/** Sidebar / header / router ordering for the character sheet, schema sections plus History. */
export const SHEET_TABS = Object.entries(CHARACTER_SECTIONS).flatMap(([id, section]) => {
  const tab = { id, icon: section.icon, label: section.label, description: section.description, custom: false }
  return id === 'narrative' ? [tab, HISTORY_TAB] : [tab]
})

export const FORM_TAB_IDS = SHEET_TABS.filter((t) => !t.custom).map((t) => t.id)
