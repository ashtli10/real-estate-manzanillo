# FFmpeg Processor Container for Cloudflare Containers
# Generates video thumbnails and GIF previews

FROM node:20-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg curl

# Create app directory
WORKDIR /app

# Copy the server script
COPY container-server.js ./

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "container-server.js"]
