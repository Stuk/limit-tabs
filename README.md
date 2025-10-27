# Limit tabs

This add-on limits tabs by removing a tab when a new tab is added that takes the number of open tabs to more than the limit. Pinned tabs are ignored. The limit can be applied per window (default) or globally.

Based on https://addons.mozilla.org/en-US/firefox/addon/rudolf-fernandes/ with changes to support Chrome.

## Settings

- **Maximum number of Tabs**: Set the tab limit (minimum 1)
- **Above limit per window**: When checked (default), the limit applies per window. When unchecked, the limit applies globally across all windows.
- **Reset maximum to current number of tabs when reenabled after disabling**: When checked, the maximum will reset to match the current tab count when you re-enable the extension after disabling it.
- **When exceeded, remove tab**: Choose which tab to close when the limit is reached:
  - **Newest** (default): Closes the most recently opened tab
  - **Least Recently Used**: Closes the tab that hasn't been viewed in the longest time
  - **Left-Most**: Closes the leftmost non-pinned tab
  - **Right-Most**: Closes the rightmost tab
- **Disable Toolbar On/Off Toggle**: Prevents toggling the extension on/off from the toolbar.
- **Show Number of Tabs instead of Percentage**: Changes the toolbar display to show tab count instead of percentage of limit.

## License

GNU General Public License v3.0
