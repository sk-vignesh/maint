# OnTrack API Seed Script

Creates test data via the live OnTrack API endpoints.

## Structure

| File | Purpose |
|---|---|
| `seed-config.ts` | **Portable data config** — generators, reference data, no API calls. Reuse in any environment. |
| `seed.ts` | **Runner** — logs in, calls API, creates records using the config. |

## Usage

```bash
# Set credentials
set ONTRACK_EMAIL=your-email@example.com
set ONTRACK_PASSWORD=your-password

# Run with defaults (15 templates + 1000 checks)
npx tsx scripts/seed-data/seed.ts

# Override counts
set SEED_TEMPLATES=5
set SEED_CHECKS=500
npx tsx scripts/seed-data/seed.ts

# Different environment
set ONTRACK_API_URL=https://staging-api.example.com/int/v1
npx tsx scripts/seed-data/seed.ts
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ONTRACK_API_URL` | `https://ontrack-api.agilecyber.com/int/v1` | API base URL |
| `ONTRACK_EMAIL` | *(required)* | Login email |
| `ONTRACK_PASSWORD` | *(required)* | Login password |
| `SEED_TEMPLATES` | `15` | Number of templates to create |
| `SEED_CHECKS` | `1000` | Number of checks to create |
| `SEED_CONCURRENCY` | `10` | Parallel API requests |

## Reusing the Data Config

```typescript
import { seedConfig, generateTemplate, generateCheck } from "./seed-config"

// Generate standalone data (no API dependency)
const template = generateTemplate(0)
const check = generateCheck(0, [template])

// Access reference data
console.log(seedConfig.referenceData.vehicleMakes)
console.log(seedConfig.referenceData.templateSections)
```
