docker buildx build --platform linux/amd64,linux/arm64 \
  -t quanluonluon/gigafit-api:latest \
  --push .