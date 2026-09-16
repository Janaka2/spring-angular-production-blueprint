# syntax=docker/dockerfile:1.7
# AssetCare API. Multi-stage: build with the Maven wrapper on a JDK, run on a JRE as a non-root user.
# Multi-arch (linux/amd64, linux/arm64) through buildx; nothing here is architecture specific.

FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace
# dependency layer first so a code change does not re-download the world
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q -B --no-transfer-progress dependency:go-offline
COPY src/ src/
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q -B --no-transfer-progress -DskipTests package \
 && java -Djarmode=tools -jar target/assetcare-api-*.jar extract --layers --launcher --destination extracted

FROM eclipse-temurin:25-jre AS runtime
LABEL org.opencontainers.image.title="assetcare-api" \
      org.opencontainers.image.source="https://github.com/Janaka2/spring-angular-production-blueprint" \
      org.opencontainers.image.licenses="Apache-2.0"
# non-root: a fixed uid so Kubernetes securityContext.runAsUser matches
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --home /app --shell /usr/sbin/nologin app
WORKDIR /app
# Spring Boot layers: dependencies change rarely, application code often
COPY --from=build --chown=app:app /workspace/extracted/dependencies/ ./
COPY --from=build --chown=app:app /workspace/extracted/spring-boot-loader/ ./
COPY --from=build --chown=app:app /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=app:app /workspace/extracted/application/ ./
RUN mkdir -p /app/data && chown app:app /app/data
USER 10001:10001
EXPOSE 8080
# Container-aware JVM: heap from the cgroup limit, exit on OOM so Kubernetes restarts a broken pod, structured logs
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom" \
    ASSETCARE_LOG_FORMAT=ecs \
    ASSETCARE_DEMO_DATA=false \
    ASSETCARE_LIQUIBASE_CONTEXTS=prod
# graceful shutdown: Spring Boot handles SIGTERM (server.shutdown=graceful); exec form so PID 1 is the JVM.
# Liveness and readiness are Kubernetes probes against /actuator/health/*; no Docker HEALTHCHECK, so the image
# stays free of curl and the two do not disagree.
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
