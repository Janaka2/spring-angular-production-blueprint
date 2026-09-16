{{- define "assetcare.name" -}}assetcare{{- end -}}
{{- define "assetcare.labels" -}}
app.kubernetes.io/name: assetcare
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}
{{- define "assetcare.component" -}}
{{ include "assetcare.labels" .root }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}
{{- define "assetcare.selector" -}}
app.kubernetes.io/name: assetcare
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}
{{- define "assetcare.apiSecret" -}}{{ default (printf "%s-api" .Release.Name) .Values.api.existingSecret }}{{- end -}}
{{- define "assetcare.dbUrl" -}}
{{- if .Values.postgres.enabled -}}jdbc:postgresql://{{ .Release.Name }}-postgres:5432/{{ .Values.postgres.database }}{{- else -}}{{ .Values.externalDatabase.url }}{{- end -}}
{{- end -}}
{{- define "assetcare.dbUser" -}}{{- if .Values.postgres.enabled -}}{{ .Values.postgres.username }}{{- else -}}{{ .Values.externalDatabase.username }}{{- end -}}{{- end -}}
{{- define "assetcare.issuer" -}}
{{- if .Values.keycloak.enabled -}}https://{{ .Values.global.host }}/auth/realms/assetcare{{- else -}}{{ .Values.externalKeycloak.issuer }}{{- end -}}
{{- end -}}
{{- define "assetcare.s3Endpoint" -}}
{{- if .Values.minio.enabled -}}http://{{ .Release.Name }}-minio:9000{{- else -}}{{ .Values.externalObjectStorage.endpoint }}{{- end -}}
{{- end -}}
{{- define "assetcare.s3Bucket" -}}{{- if .Values.minio.enabled -}}{{ .Values.minio.bucket }}{{- else -}}{{ .Values.externalObjectStorage.bucket }}{{- end -}}{{- end -}}
{{- define "assetcare.securityContext" -}}
runAsNonRoot: {{ .Values.podSecurity.runAsNonRoot }}
seccompProfile:
  type: {{ .Values.podSecurity.seccompProfile }}
{{- end -}}
{{- define "assetcare.containerSecurity" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: false
capabilities:
  drop: ["ALL"]
{{- end -}}
