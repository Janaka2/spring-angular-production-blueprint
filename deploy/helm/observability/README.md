# Observability profile on Kubernetes

The free VM cannot carry a second copy of everything, so the observability profile installs the upstream charts with
small, pinned values instead of re-templating them here. Same components as `docker-compose.observability.yml`.

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update

kubectl create namespace observability
helm upgrade --install kps prometheus-community/kube-prometheus-stack -n observability -f deploy/helm/observability/kube-prometheus-stack.yaml
helm upgrade --install loki grafana/loki -n observability -f deploy/helm/observability/loki.yaml
helm upgrade --install tempo grafana/tempo -n observability -f deploy/helm/observability/tempo.yaml
helm upgrade --install otel open-telemetry/opentelemetry-collector -n observability -f deploy/helm/observability/otel-collector.yaml
helm upgrade --install assetcare deploy/helm/assetcare -n assetcare --set observability.enabled=true
```

The AssetCare chart then creates a `ServiceMonitor` for the API and points its OTLP exporter at the collector. Load
`observability/grafana/dashboards/assetcare-overview.json` and `observability/prometheus/rules.yml` through the values
below (they are mounted as ConfigMaps by the kube-prometheus-stack chart).

Retention is days, not weeks: this is a 24 GB node shared with the application.
