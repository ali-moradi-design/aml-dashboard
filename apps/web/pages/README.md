# Why this folder is empty

Routes live in `app/` (Next.js App Router). The FSD layers live in `src/`,
and one of them is called `pages` (`src/pages`).

This empty root `pages/` folder stops Next.js from treating `src/pages` as
the old Pages Router. Do not delete it.
