# Workshop starter

- Keep this a frontend-only Vue 3 / TypeScript application; do not introduce a backend, payment service, or cloud dependency.
- Use `src/services/productStorage.ts` and `src/types/product.ts` for the storefront catalog; keep the fictional sales fixture in `src/data/sales.json` and persist its browser copy through `src/services/salesStorage.ts`.
- Preserve existing localStorage data on load. Keep the new product, sales, and cart keys versioned separately; report read, validation, and write failures visibly instead of silently replacing data.
- Keep sample data fictional and illustrations local so the app runs without external services.
- Keep the data register read-only except for local demonstration orders. The sales dashboard follows `docs/specs/2026-11-24-dashboard-ventes.md`; it presents fictional orders and must never modify stored sales data.
- Run `npm test` and `npm run build` after code changes.
