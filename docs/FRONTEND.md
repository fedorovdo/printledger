# Frontend Overview

The frontend is a Next.js and TypeScript application.

## Routes

- `/` - dashboard with status cards and cartridge usage analytics.
- `/login` - login page.
- `/profile` - current user profile and password change.
- `/users` - admin-only user management.
- `/cartridges` - cartridge stock list with search, sorting, column visibility, quick stock-in, and quick replacement actions.
- `/cartridges/{id}` - cartridge model card with stock, history, and model-specific actions.
- `/printers` - printer list with filters, search, sorting, column visibility, and quick location change.
- `/printers/{id}` - printer card with installed cartridges, cartridge history, location history, repairs, archive history, and actions.
- `/locations` - organization, branch, and location directory management.
- `/operations` - cartridge operation journal.
- `/backup` - admin-only backup management.
- `/about` - application information and status.

## API Base URL

The UI uses `NEXT_PUBLIC_API_BASE_URL`.

- Development: points to `http://localhost:8000`.
- Production: empty value, so the browser uses same-origin `/api` and `/health` through nginx.

## Localization

Russian is the default language. English is available from the top-right language switcher.

Frontend enum labels are localized for RU/EN, while API payload values remain stable English enum values such as:

- `new`
- `refilled`
- `laser`
- `written_off`

## UX Patterns

- Forms for catalog and quick actions open in a right-side panel.
- Table row actions use compact icon buttons with hover tooltips.
- Main printer, cartridge, and location tables support browser-saved column visibility settings.
- Search can still match hidden columns.

## Dashboard Analytics

The dashboard includes cartridge usage analytics for purchasing planning.

- Periods: 30, 90, and 365 days.
- Optional cartridge model filter.
- Inactive cartridge models are hidden by default.
- Rows needing purchases are highlighted.
- The current analytics view can be exported to CSV for Excel.

Usage is calculated from `install` and `write_off` transactions. Returns, stock-in, and corrections are not counted as usage.
