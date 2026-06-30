# 1.5.0

- Edit the start and end times of tracked entries directly from the calendar day view, with overlap protection so two entries can't cover the same time
- "Forgot to start the timer" now refuses a start time that overlaps an existing entry and tells you why, instead of silently doing nothing
- "Forgot to start the timer" now shows a message when the chosen start time is in the future
- Fixed switching tabs sometimes briefly rendering two screens stacked on top of each other
- Fixed the shown screen occasionally getting out of sync with the selected tab when switching quickly
- Fixed pop-up messages vanishing almost instantly when actions were triggered in quick succession

# 1.4.2

- Fixed imported flex balance not showing in the calendar drawer for the current day
- Fixed background flashing bright white on app launch before settling to dark
- App loads faster — charts and Excel export are now only fetched when you actually use them, and non-timer tabs load on first visit instead of upfront

# 1.4.1

- Fixed imported flex time showing up on the timer screen and corrupting the day's work tracking
- Fixed imported flex causing phantom calendar dots and appearing as a day in the report
- Report list now shows the most recent day at the top

# 1.4.0

- Import flex time from a previous app or system directly into your balance via the Flex Bank
- "What's New" popup now reliably appears after every update, even when the app is installed as a PWA
- Fixed flex balance being wrong — deficit days no longer silently drain your bank, and imported flex counts everywhere it should
- Fixed daily work target incorrectly subtracting break time (an 8h target now means 8h on the timer, not 7h 30m)
- Redesigned Flex Bank — cleaner balance card, icons on each transaction row, import button at the bottom
- Redesigned calendar day drawer — entries show a color dot per type and their time range, summary pinned at the bottom
- Redesigned report view — summary cards now have icons and a weekly progress bar; daily rows show time range, entry type indicators, and the day's flex result
- Background gradient during the day now has a beachy cyan feel and actually shows through instead of being swamped by the dark overlay

# 1.3.0

- Auto-fill flex time when stopping the timer (configurable in Settings)
- Calendar dots now show work/flex/missing split with 45-degree color coding
- Calendar legend modal explaining what each dot color means
- Excel export in Report view with automatic formulas for HR validation
- Fixed "forgot to stop" timer saving wrong end time
- Fixed timer continuing to run while the recovery dialog was open
- Fixed auto-fill flex being skipped when recovering a forgotten timer
- Custom time input in recovery dialog now validates against max work time
- "What's New" popup on app launch after an update

# 1.2.0

- Report graphs drawer with daily and weekly bar charts
- Week number displayed on the timer screen
- Timer card now shows today's logged entries and live flex balance
- Polished report layout and fixed ghost taps on charts

# 1.1.0

- Flex bank shows full days off and days in credit
- Daily flex gains are now rounded consistently
- Aligned flex bank totals and balance calculations

# 1.0.0

- Timer with start, pause, stop and manual entry
- Calendar view with daily entry editing
- Monthly report with summary and daily breakdown
- Flex time bank with running balance
- Settings: work target, break time, max hours, rounding, haptics
- "Forgot to stop" timer recovery dialog
- 5 languages: English, Finnish, Swedish, Polish, Spanish
- Installable PWA with offline support
