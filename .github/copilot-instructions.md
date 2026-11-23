# Workshop starter

- Keep this a frontend-only Vue 3 / TypeScript application; do not introduce a backend, payment service, or cloud dependency.
- Use `src/services/productStorage.ts` and `src/types/product.ts` for the album storefront catalog (`Album` is defined in `src/types/album.ts`); keep the generated fictional sales fixture in `src/data/sales.json` and persist its browser copy through `src/services/salesStorage.ts`.
- Preserve existing localStorage data on load. Keep the new product, sales, and cart keys versioned separately; report read, validation, and write failures visibly instead of silently replacing data.
- Keep sample data fictional and illustrations local so the app runs without external services.
- Keep the data register read-only except for local demonstration orders. Do not build the sales dashboard; participants create it during the workshop.
- Keep order amounts in integer USD cents until display; use historical line prices, and do not infer margin without costs.
- Run `npm test` and `npm run build` after code changes.
