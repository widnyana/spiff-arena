#!/usr/bin/env bash

TAG="asia-southeast2-docker.pkg.dev/aruna-383416/kw-container-images/spiffworkflow-frontend:v0.0.44-infra-version"

podman build --format=docker \
    --iidfile ./tmp/iidfile \
    --tag "${TAG}" \
    -f Dockerfile \
    .

podman push "${TAG}"