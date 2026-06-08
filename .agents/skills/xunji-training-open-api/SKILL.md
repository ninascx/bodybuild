---
name: xunji-training-open-api
description: Use when the user explicitly asks to read, import, export, organize, summarize, or write back Xunji training data through the Xunji Training Open API. Enforce Chinese movement names only, date-based caching, API rate limits, authentication secrecy, and confirmation before any writeback.
---

# Xunji Training Data Open API

## Non-Negotiable Rules

- Call the API only when the user explicitly asks to read, import, export, organize, or write back training data.
- Before any live writeback, show a concise change summary and wait for explicit user confirmation.
- Use only Chinese movement `name` values in user-facing actions and write payloads. Never use or expose movement internal keys.
- Do not invent movement names. If a standard name is uncertain, check `https://github.com/Foveluy/Xunji-movements` and choose only from its Chinese names; ask the user if still uncertain.
- Do not delete old training records just because they are absent from a submitted list.
- Do not persist API credentials in skill files, logs, git-tracked files, command text, body fields, or query strings.

## Authentication

- Base URL: `https://trains.xunjiapp.cn`
- Prefer request header `Authorization: Bearer <token>`.
- Fallback header: `x-api-key: <token>`.
- Obtain the token from the active user-provided credential or a local secret such as `XUNJI_OPEN_API_KEY`. If no token is available, ask the user to copy or reapply one from the app.
- Never put the token in a request body or query parameter. Avoid command forms that echo the token in shell history or logs.

## Cache And Rate Limits

- Cache successful reads by `datestr` in the current session. When persistent cache is useful, store only API responses under the workspace-ignored `.codex/xunji-open-api-cache/` directory.
- Same `datestr` should not be fetched repeatedly. If a light cache exists but full data is required, perform at most one full-data upgrade fetch, then replace that date's cache.
- After successful writeback, replace the cached date with the server-normalized `res`.
- Same user and same training day limits:
  - Light read: at least 15 seconds between requests.
  - Full read: at least 30 seconds between requests.
  - Writeback: at least 45 seconds between requests.
- On `too frequent`, wait for the retry time reported by the service before trying again.

## Reading Training Data

Endpoint: `POST /api_trains_for_llm_v2`

Default request:

```json
{
  "schema_version": "train_open_api_v2",
  "datestr": "YYYY-MM-DD",
  "include_full_data": false
}
```

- Use `include_full_data: false` by default.
- Use `include_full_data: true` only when the task needs unchecked sets, RPE, notes, completion feelings, left/right weights, actual practice seconds, per-set rest seconds, or full details for composite sets.
- Successful responses have `success === true`; training records are in `res.trains`.
- Cardio, timed, Tabata, Apple Health, and other metric-style records may expose summaries in `sets[].metrics`, including distance, kcal/calories, workoutTime, avgHeartRate, and maxHeartRate.
- Apple Health training `name` may be a sport type such as `Running`.
- Superset and drop-set details may appear in `sets[].items[]`; each child item has its own `set` containing weight/unit/reps/time/metrics.
- When preparing to update an existing training record, preserve `localid`, `start`, and `end` unless the user explicitly asks to change time.

## Writing Training Data

Endpoint: `POST /api_upsert_trains_for_llm_v2`

Payload shape:

```json
{
  "schema_version": "train_open_api_v2",
  "client_request_id": "unique-id-from-agent",
  "dry_run": false,
  "include_full_data": false,
  "res": [
    {
      "datestr": "YYYY-MM-DD",
      "localid": 123456,
      "title": "胸部训练",
      "start": 1744010000000,
      "end": 1744013600000,
      "movements": [
        {
          "name": "杠铃卧推",
          "sets": [
            { "done": true, "weight": "60", "unit": "kg", "reps": "10" }
          ]
        }
      ]
    }
  ]
}
```

- `res` may be either an array of trainings or `{ "trains": [...] }`.
- Submit at most 4 trainings per request, and all must belong to the same `datestr`.
- Each training may contain at most 15 movements. Each movement may contain at most 20 sets.
- Include `localid` to update an existing record; omit `localid` only when creating a new training.
- For old training updates, preserve `localid`, `start`, and `end` unless the user explicitly asks to change time.
- Send movement Chinese `name` only. Do not send any movement `key`.
- Each set must include at least one of `weight`/`weight_kg`, `reps`, `time`/`duration_s`, or `selfWeight`.
- Keep unfinished sets as `done: false`; do not silently remove unfinished sets read from full-data mode.
- Use `dry_run: false` only after user confirmation. If using a dry run, still summarize what will be sent.
- After `success === true`, use the server-returned normalized `res` as the source of truth and cache replacement.

## Error Handling

- `apikey missing` or `apikey invalid`: ask the user to copy or reapply the key in the app.
- `仅VIP可用`: tell the user the current account needs VIP access.
- Unknown movement name: do not write; ask the user to confirm the Chinese movement name.
- Any non-success response: report the API message plainly and avoid partial assumptions.
