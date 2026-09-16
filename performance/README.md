# Performance tests (k6)

Two reproducible scenarios against a running stack (`make deps`, `make backend`), each with thresholds that act as the
reference service-level objectives. They obtain a token through the development realm's password-grant client, which
exists only in development.

```bash
k6 run performance/k6/read.js                       # list, search, read one: 20 virtual users, 60 s
VUS=50 DURATION=2m k6 run performance/k6/read.js
k6 run performance/k6/write.js                      # create + update + archive: 5 virtual users
API_URL=https://assetcare.example.com/api KEYCLOAK_URL=https://assetcare.example.com/auth k6 run performance/k6/read.js
```

Reference SLOs (p95): list 300 ms, search 400 ms, read one 150 ms, create and update 400 ms, error rate below 1%.

## Results

Results are only meaningful with the hardware and conditions stated. Record them here as they are measured:

| Date | Environment | Scenario | VUs | Throughput | avg | p95 | p99 | errors |
|---|---|---|---|---|---|---|---|---|
| not yet executed | | | | | | | | |

No result is published from a run that was not made. A laptop run with the compose stack is a functional check of the
scripts, not a capacity statement; the OCI VM run is the reference number for the free deployment.
