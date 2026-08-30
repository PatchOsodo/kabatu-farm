# syntax=docker/dockerfile:1
#
# Same recipe that already worked on the Fedora test box (alpine base,
# pinned v0.23.4 binary) — just made reproducible via Dockerfile instead of
# manual `docker exec` steps. Bump PB_VERSION deliberately; don't float
# "latest" for a database service.

FROM alpine:3.20 AS fetch
ARG PB_VERSION=0.23.4
ARG TARGETARCH
RUN apk add --no-cache unzip curl ca-certificates && \
    ARCH=$(case "${TARGETARCH}" in \
      "amd64") echo "amd64" ;; \
      "arm64") echo "arm64" ;; \
      *) echo "${TARGETARCH}" ;; \
    esac) && \
    curl -fsSL -o /tmp/pb.zip \
      "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${ARCH}.zip" && \
    unzip /tmp/pb.zip -d /pb && \
    chmod +x /pb/pocketbase

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /pb
COPY --from=fetch /pb/pocketbase /pb/pocketbase

# pb_data (SQLite + uploads) and pb_migrations are bind-mounted in via
# docker-compose, not baked into the image — see docker-compose.yml.
EXPOSE 8090
ENTRYPOINT ["/pb/pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090"]
